
export const COLORS = {
  primary: '#2E7D32',
  primaryDark: '#1B5E20',
  accent: '#A5D6A7',
  background: '#F1F8E9',
  white: '#FFFFFF',
  error: '#D32F2F',
};

// Added MOCK_POSTS for the KisanSocial feed
export const MOCK_POSTS = [
  {
    id: '1',
    author: 'Ramesh Patil',
    avatar: 'https://picsum.photos/seed/ramesh/100/100',
    timestamp: '2 hours ago',
    type: 'image' as const,
    image: 'https://picsum.photos/seed/farm1/800/800',
    likes: 24,
    comments: 5,
    liked: false,
    saved: false,
    caption: 'Great harvest this season! My organic mushrooms are ready for market.',
    tags: ['Organic', 'Mushrooms', 'Harvest']
  },
  {
    id: '2',
    author: 'Sita Devi',
    avatar: 'https://picsum.photos/seed/sita/100/100',
    timestamp: '5 hours ago',
    type: 'video' as const,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    likes: 156,
    comments: 12,
    liked: true,
    saved: true,
    caption: 'Quick tip on how to maintain soil moisture during high heat.',
    tags: ['SoilHealth', 'SummerFarming', 'Tips']
  },
  {
    id: '3',
    author: 'Amit Singh',
    avatar: 'https://picsum.photos/seed/amit/100/100',
    timestamp: 'Yesterday',
    type: 'image' as const,
    image: 'https://picsum.photos/seed/farm2/800/800',
    likes: 89,
    comments: 3,
    liked: false,
    saved: false,
    caption: 'Checking out the new drip irrigation system. Looking promising!',
    tags: ['Irrigation', 'Technology', 'Efficiency']
  }
];
