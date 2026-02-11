
import React, { useState, useRef, useEffect } from 'react';
import { MOCK_POSTS, COLORS } from '../constants';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  UserPlus,
  ArrowLeft,
  Plus,
  Mic,
  Radio,
  Play,
  Volume2,
  VolumeX,
  X,
  Camera,
  Image as ImageIcon,
  Film,
  Search,
  Hash
} from 'lucide-react';
import { Screen, Post } from '../types';

interface SocialScreenProps {
  navigateTo: (screen: Screen) => void;
}

const SocialScreen: React.FC<SocialScreenProps> = ({ navigateTo }) => {
  const [viewMode, setViewMode] = useState<'feed' | 'shorts'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState<string | null>(null);
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Load posts from API
  const loadPosts = async () => {
    try {
      setLoading(true);
      const { communityService } = await import('../src/services/api');
      const data = await communityService.getFeed();
      // Map API response to UI model if needed, though they should be close
      const mapped = data.map((p: any) => ({
        id: p.id,
        author: p.user_name || 'Farmer',
        avatar: `https://picsum.photos/seed/${p.user_name}/100/100`, // Avatar placeholder
        timestamp: new Date(p.created_at).toLocaleDateString(),
        type: p.image_url ? 'image' : 'text',
        image: p.image_url || 'https://picsum.photos/seed/farm/800/800', // Fallback
        videoUrl: null, // Shorts not fully claimed in backend yet
        likes: p.likes_count,
        comments: p.comments_count,
        liked: p.liked_by_me,
        saved: false,
        caption: p.content,
        tags: ['Farming', 'Community'] // Mock tags
      }));
      setPosts(mapped);
    } catch (e) {
      console.error("Failed to load feed", e);
      setPosts(MOCK_POSTS); // Fallback to mock on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const toggleLike = async (id: string | number) => {
    // Optimistic Update
    setPosts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, likes: p.likes + (p.liked ? -1 : 1), liked: !p.liked };
      }
      return p;
    }));

    try {
      const { communityService } = await import('../src/services/api');
      await communityService.likePost(id);
    } catch (e) {
      // Revert if failed (optional, keeping simple)
      console.error("Like failed", e);
    }
  };

  const toggleSave = (id: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, saved: !p.saved };
      }
      return p;
    }));
  };

  if (showProfile) {
    return <FarmerProfileView onBack={() => setShowProfile(null)} name={showProfile} />;
  }

  return (
    <div className={`h-full flex flex-col ${viewMode === 'shorts' ? 'bg-black' : 'bg-white'}`}>
      {/* Dynamic Header */}
      {viewMode === 'feed' && (
        <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-30 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-green-700 tracking-tight">KisanSocial</h2>
          </div>
          <div className="flex gap-5">
            <button
              onClick={() => setShowCreateOverlay(true)}
              className="p-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors"
            >
              <Plus size={22} strokeWidth={3} />
            </button>
            <button className="p-2 text-gray-900">
              <Search size={22} strokeWidth={2.5} />
            </button>
            <button className="p-2 text-gray-900 relative">
              <Send size={22} strokeWidth={2.5} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className={`flex border-b ${viewMode === 'shorts' ? 'bg-black border-white/10' : 'bg-white border-gray-100'}`}>
        <button
          onClick={() => setViewMode('feed')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'feed' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-400'
            }`}
        >
          Community Feed
        </button>
        <button
          onClick={() => setViewMode('shorts')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'shorts' ? 'text-white border-b-2 border-white' : 'text-gray-400'
            }`}
        >
          Krishi Shorts
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {viewMode === 'feed' ? (
          <>
            {/* Stories Bar */}
            <div className="py-5 border-b border-gray-50 flex gap-4 px-6 overflow-x-auto no-scrollbar bg-white">
              <div className="flex flex-col items-center gap-2 min-w-[70px]">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-green-300 p-1 flex items-center justify-center bg-green-50 relative">
                  <Plus size={24} className="text-green-600" />
                  <div className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-1 text-white border-2 border-white">
                    <Camera size={10} />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">My Story</span>
              </div>
              {posts.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-2 min-w-[70px]">
                  <div className="w-16 h-16 rounded-full border-2 border-green-500 p-1">
                    <img src={p.avatar} className="w-full h-full rounded-full object-cover" alt={p.author} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-900 truncate w-16 text-center">{p.author.split(' ')[0]}</span>
                </div>
              ))}
            </div>

            {/* Standard Feed */}
            <div className="bg-[#f8fafc] space-y-4 pt-4">
              {posts.map((post) => (
                <FeedPost
                  key={post.id}
                  post={post}
                  onLike={() => toggleLike(post.id)}
                  onSave={() => toggleSave(post.id)}
                  onProfileClick={() => setShowProfile(post.author)}
                  isMuted={isMuted}
                  toggleMute={() => setIsMuted(!isMuted)}
                />
              ))}
            </div>
          </>
        ) : (
          /* Krishi Shorts (Vertical Video) */
          <div className="h-full snap-y snap-mandatory overflow-y-auto no-scrollbar">
            {posts.filter(p => p.type === 'video').map((post) => (
              <ShortsPost
                key={post.id}
                post={post}
                onLike={() => toggleLike(post.id)}
                onProfileClick={() => setShowProfile(post.author)}
                isMuted={isMuted}
                toggleMute={() => setIsMuted(!isMuted)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Post Overlay */}
      {showCreateOverlay && (
        <CreatePostOverlay onClose={() => setShowCreateOverlay(false)} />
      )}
    </div>
  );
};

const FeedPost: React.FC<{
  post: Post;
  onLike: () => void;
  onSave: () => void;
  onProfileClick: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}> = ({ post, onLike, onSave, onProfileClick, isMuted, toggleMute }) => {
  return (
    <div className="bg-white border-y border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex justify-between items-center">
        <button onClick={onProfileClick} className="flex items-center gap-3">
          <div className="relative">
            <img src={post.avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-green-50" alt={post.author} />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="text-left">
            <h4 className="text-sm font-black text-gray-900 leading-none">{post.author}</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{post.timestamp}</p>
          </div>
        </button>
        <div className="flex items-center gap-4">
          <button className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-wider">Follow</button>
          <MoreHorizontal size={18} className="text-gray-300" />
        </div>
      </div>

      <div className="relative aspect-square bg-black">
        {post.type === 'video' ? (
          <VideoPlayer url={post.videoUrl!} muted={isMuted} />
        ) : (
          <img src={post.image} className="w-full h-full object-cover" alt="Post" />
        )}

        {post.type === 'video' && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            className="absolute bottom-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        )}
      </div>

      <div className="px-5 py-5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-6">
            <button onClick={onLike} className="flex items-center gap-1.5 group">
              <Heart size={26} className={`${post.liked ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-900'} transition-all`} />
              <span className="text-sm font-black text-gray-900">{post.likes}</span>
            </button>
            <button className="flex items-center gap-1.5 group">
              <MessageCircle size={26} className="text-gray-900 group-hover:text-blue-500 transition-colors" />
              <span className="text-sm font-black text-gray-900">{post.comments}</span>
            </button>
            <button>
              <Send size={26} className="text-gray-900" />
            </button>
          </div>
          <button onClick={onSave}>
            <Bookmark size={26} className={`${post.saved ? 'fill-amber-500 text-amber-500' : 'text-gray-900'}`} />
          </button>
        </div>

        <p className="text-sm text-gray-800 leading-relaxed">
          <span className="font-black mr-2 text-gray-900">{post.author}</span>
          {post.caption}
        </p>

        <div className="flex flex-wrap gap-2 mt-3">
          {post.tags?.map(tag => (
            <span key={tag} className="text-[10px] font-black text-green-700 uppercase tracking-widest flex items-center gap-0.5">
              <Hash size={10} /> {tag}
            </span>
          ))}
        </div>

        <button className="text-[10px] text-gray-400 font-black mt-4 uppercase tracking-[0.2em]">View all {post.comments} comments</button>
      </div>
    </div>
  );
};

const ShortsPost: React.FC<{
  post: Post;
  onLike: () => void;
  onProfileClick: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}> = ({ post, onLike, onProfileClick, isMuted, toggleMute }) => {
  return (
    <div className="h-full w-full snap-start relative bg-black flex items-center justify-center">
      <VideoPlayer url={post.videoUrl!} muted={isMuted} loop />

      {/* Overlay UI */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none"></div>

      <div className="absolute bottom-10 left-6 right-20 pointer-events-auto">
        <button onClick={onProfileClick} className="flex items-center gap-3 mb-4">
          <img src={post.avatar} className="w-10 h-10 rounded-full border-2 border-white" alt="" />
          <span className="text-sm font-black text-white">{post.author}</span>
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[9px] font-black text-white uppercase border border-white/20">Follow</span>
        </button>
        <p className="text-sm text-white/90 font-medium leading-relaxed line-clamp-2">
          {post.caption}
        </p>
        <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar">
          {post.tags?.map(tag => (
            <span key={tag} className="px-2 py-1 bg-white/10 backdrop-blur-md rounded-md text-[8px] font-black text-white uppercase border border-white/10">#{tag}</span>
          ))}
        </div>
      </div>

      <div className="absolute right-4 bottom-24 flex flex-col gap-8 items-center pointer-events-auto">
        <button onClick={onLike} className="flex flex-col items-center gap-1">
          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${post.liked ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>
            <Heart size={24} fill={post.liked ? "currentColor" : "none"} />
          </div>
          <span className="text-[10px] font-black text-white">{post.likes}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="p-3 bg-white/10 rounded-full backdrop-blur-md text-white">
            <MessageCircle size={24} />
          </div>
          <span className="text-[10px] font-black text-white">{post.comments}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="p-3 bg-white/10 rounded-full backdrop-blur-md text-white">
            <Send size={24} />
          </div>
        </button>
        <button onClick={toggleMute} className="p-3 bg-white/10 rounded-full backdrop-blur-md text-white mt-4">
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>
    </div>
  );
};

const VideoPlayer: React.FC<{ url: string; muted: boolean; loop?: boolean }> = ({ url, muted, loop = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          videoRef.current?.play();
          setIsPlaying(true);
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      });
    }, { threshold: 0.7 });

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full h-full relative group flex items-center justify-center">
      <video
        ref={videoRef}
        src={url}
        muted={muted}
        loop={loop}
        playsInline
        className="w-full h-full object-cover"
        onClick={() => {
          if (videoRef.current?.paused) {
            videoRef.current.play();
            setIsPlaying(true);
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        }}
      />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="p-5 bg-black/20 backdrop-blur-lg rounded-full text-white/80">
            <Play size={40} fill="currentColor" />
          </div>
        </div>
      )}
    </div>
  );
};

const CreatePostOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [caption, setCaption] = useState('');

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col">
      <div className="p-6 flex justify-between items-center border-b border-white/10">
        <button onClick={onClose} className="p-2 text-white/60"><X size={24} /></button>
        <h3 className="text-lg font-black text-white">Share Multi-Media</h3>
        <button
          disabled={step === 2 && !caption}
          onClick={step === 1 ? () => setStep(2) : onClose}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${step === 2 && !caption ? 'bg-white/10 text-white/30' : 'bg-green-600 text-white'
            }`}
        >
          {step === 1 ? 'Next' : 'Share'}
        </button>
      </div>

      <div className="flex-1 p-8 flex flex-col gap-10 overflow-y-auto">
        {step === 1 ? (
          <div className="grid grid-cols-2 gap-6 pt-10">
            <CreateModeCard icon={<ImageIcon size={32} />} label="Photo" sub="Single or Gallery" />
            <CreateModeCard icon={<Film size={32} />} label="Shorts" sub="Max 60 Seconds" />
            <CreateModeCard icon={<Radio size={32} />} label="Go Live" sub="Audio or Video" />
            <CreateModeCard icon={<Mic size={32} />} label="Audio Tip" sub="Podcast Style" />
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right duration-300">
            <div className="flex gap-4">
              <div className="w-20 h-24 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white/40 italic text-[10px]">Preview</div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe your harvest or farming tip..."
                className="flex-1 bg-transparent border-none outline-none text-white text-lg font-medium resize-none h-32 pt-2"
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 text-white">
                <span className="text-sm font-bold flex items-center gap-2"><Hash size={16} /> Add Tags</span>
                <span className="text-xs text-green-500 font-black">Wheat, Organic</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 text-white">
                <span className="text-sm font-bold flex items-center gap-2"><ImageIcon size={16} /> Share to Mandi</span>
                <div className="w-10 h-6 bg-white/20 rounded-full relative">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CreateModeCard: React.FC<{ icon: React.ReactNode; label: string; sub: string }> = ({ icon, label, sub }) => (
  <button className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col items-center gap-4 text-center active:scale-95 transition-all hover:bg-white/10">
    <div className="p-4 bg-green-700 rounded-3xl text-white shadow-xl shadow-green-900/40">
      {icon}
    </div>
    <div>
      <h4 className="text-base font-black text-white">{label}</h4>
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-1">{sub}</p>
    </div>
  </button>
);

const FarmerProfileView: React.FC<{ onBack: () => void; name: string }> = ({ onBack, name }) => (
  <div className="bg-white min-h-full animate-in slide-in-from-right duration-300">
    <div className="p-4 flex items-center gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
      <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
      <h2 className="text-lg font-black">{name}</h2>
    </div>

    <div className="p-6 flex flex-col items-center">
      <div className="relative mb-6">
        <img src={`https://picsum.photos/seed/${name}/200/200`} className="w-28 h-28 rounded-[2.5rem] border-4 border-green-50 shadow-xl object-cover" alt={name} />
        <div className="absolute -bottom-2 -right-2 bg-green-600 p-2 rounded-2xl shadow-lg border-2 border-white text-white">
          <UserPlus size={20} />
        </div>
      </div>
      <h3 className="text-2xl font-black text-gray-900">{name}</h3>
      <p className="text-green-600 text-xs font-black uppercase tracking-widest mt-1 mb-4">Organic Farming Specialist</p>

      <div className="grid grid-cols-3 w-full gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded-3xl text-center">
          <p className="font-black text-xl text-gray-900">128</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Posts</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-3xl text-center">
          <p className="font-black text-xl text-gray-900">1.2k</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Fans</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-3xl text-center">
          <p className="font-black text-xl text-gray-900">4.8</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Rating</p>
        </div>
      </div>

      <div className="flex w-full gap-3">
        <button className="flex-1 py-4 bg-green-700 text-white rounded-[1.5rem] font-bold shadow-xl shadow-green-100 active:scale-95 transition-all">Message</button>
        <button className="px-6 py-4 bg-gray-100 text-gray-900 rounded-[1.5rem] font-bold active:scale-95 transition-all">Consult</button>
      </div>
    </div>

    {/* Post Tabs */}
    <div className="flex border-t border-gray-100">
      <button className="flex-1 py-4 flex justify-center text-green-700 border-b-2 border-green-700"><Plus size={20} /></button>
      <button className="flex-1 py-4 flex justify-center text-gray-300"><Film size={20} /></button>
      <button className="flex-1 py-4 flex justify-center text-gray-300"><Bookmark size={20} /></button>
    </div>

    <div className="grid grid-cols-3 gap-0.5">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="aspect-square bg-gray-100 overflow-hidden relative group">
          <img src={`https://picsum.photos/seed/${name}-${i}/400/400`} className="w-full h-full object-cover transition-opacity group-hover:opacity-80" alt="Gallery" />
          {i % 3 === 0 && <div className="absolute top-2 right-2 text-white"><Film size={14} fill="currentColor" /></div>}
        </div>
      ))}
    </div>
  </div>
);

export default SocialScreen;
