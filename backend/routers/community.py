from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models import CommunityPost, CommunityComment, CommunityLike, User
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/community", tags=["community"])

class CommentResponse(BaseModel):
    id: int
    user_name: str
    text: str
    created_at: str

    class Config:
        from_attributes = True

class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None

class CommentCreate(BaseModel):
    text: str

class PostResponse(BaseModel):
    id: int
    user_name: str
    user_district: Optional[str]
    content: str
    image_url: Optional[str] = None
    likes_count: int
    comments_count: int
    created_at: str
    liked_by_me: bool = False
    comments: List[CommentResponse] = []

    class Config:
        from_attributes = True

@router.get("/", response_model=List[PostResponse])
async def get_feed(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    posts = db.query(CommunityPost).options(
        joinedload(CommunityPost.user),
        joinedload(CommunityPost.comments).joinedload(CommunityComment.user),
        joinedload(CommunityPost.likes)
    ).order_by(CommunityPost.created_at.desc()).all()
    
    results = []
    for p in posts:
        liked_by_me = False
        if current_user:
            liked_by_me = any(l.user_id == current_user.id for l in p.likes)

        comments = []
        for c in p.comments:
            comments.append(CommentResponse(
                id=c.id,
                user_name=c.user.name or "Unknown",
                text=c.text,
                created_at=c.created_at.isoformat()
            ))

        results.append(PostResponse(
            id=p.id,
            user_name=p.user.name or "Unknown",
            user_district=p.user.district,
            content=p.content,
            image_url=p.image_url,
            likes_count=p.likes_count,
            comments_count=len(p.comments),
            created_at=p.created_at.isoformat(),
            liked_by_me=liked_by_me,
            comments=comments
        ))
    return results

@router.post("/", response_model=PostResponse)
async def create_post(
    post: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_post = CommunityPost(
        user_id=current_user.id,
        content=post.content,
        image_url=post.image_url
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    
    return PostResponse(
        id=new_post.id,
        user_name=current_user.name,
        user_district=current_user.district,
        content=new_post.content,
        image_url=new_post.image_url,
        likes_count=0,
        comments_count=0,
        created_at=new_post.created_at.isoformat(),
        liked_by_me=False,
        comments=[]
    )

@router.post("/{post_id}/like")
async def like_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    existing_like = db.query(CommunityLike).filter(
        CommunityLike.post_id == post_id,
        CommunityLike.user_id == current_user.id
    ).first()

    if existing_like:
        db.delete(existing_like)
        post.likes_count = max(0, post.likes_count - 1)
        action = "unliked"
    else:
        new_like = CommunityLike(post_id=post_id, user_id=current_user.id)
        db.add(new_like)
        post.likes_count += 1
        action = "liked"
    
    db.commit()
    return {"message": f"Post {action}", "likes_count": post.likes_count}

@router.post("/{post_id}/comment")
async def add_comment(
    post_id: int,
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    new_comment = CommunityComment(
        post_id=post_id,
        user_id=current_user.id,
        text=comment.text
    )
    db.add(new_comment)
    db.commit()
    
    return {"message": "Comment added"}
