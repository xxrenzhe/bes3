import { generateImageUrl } from './imageConfig';

export interface TeamMember {
  name: string;
  role: string;
  avatar: string;
  bio: string;
  expertise: string[];
  experience: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    email?: string;
  };
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Sarah Chen',
    role: 'Editor-in-Chief',
    avatar: generateImageUrl('774909', 'thumbnail'),
    bio: 'Leading tech journalism with 18+ years of experience in product reviews and industry analysis. Expert in AI and emerging technologies.',
    expertise: ['AI & Machine Learning', 'Tech Journalism', 'Product Analysis', 'Industry Trends'],
    experience: '18+ years',
    social: {
      twitter: 'https://twitter.com/sarahchen_tech',
      linkedin: 'https://linkedin.com/in/sarahchen-tech',
      email: 'sarah@bes3.com'
    }
  },
  {
    name: 'Mike Rodriguez',
    role: 'Senior Tech Reviewer',
    avatar: generateImageUrl('1300402', 'thumbnail'),
    bio: 'Specializes in consumer electronics, smartphones, and emerging technologies. 15+ years testing cutting-edge devices.',
    expertise: ['Consumer Electronics', 'Smartphones', 'Hardware Testing', 'Performance Analysis'],
    experience: '15+ years',
    social: {
      twitter: 'https://twitter.com/mike_tech_review',
      linkedin: 'https://linkedin.com/in/mike-rodriguez-tech'
    }
  },
  {
    name: 'Emma Wilson',
    role: 'Home & Wellness Editor',
    avatar: generateImageUrl('415829', 'thumbnail'),
    bio: 'Expert in smart home technology, health tech, and lifestyle products. Focus on sustainable and eco-friendly innovations.',
    expertise: ['Smart Home', 'Health Tech', 'Sustainability', 'Lifestyle Products'],
    experience: '12+ years',
    social: {
      linkedin: 'https://linkedin.com/in/emma-wilson-tech',
      email: 'emma@bes3.com'
    }
  },
  {
    name: 'Alex Kumar',
    role: 'Security & Privacy Analyst',
    avatar: generateImageUrl('1043471', 'thumbnail'),
    bio: 'Cybersecurity expert focusing on VPNs, privacy tools, and digital security. Certified ethical hacker and privacy advocate.',
    expertise: ['Cybersecurity', 'VPN Testing', 'Privacy Tools', 'Ethical Hacking'],
    experience: '10+ years',
    social: {
      twitter: 'https://twitter.com/alex_security',
      linkedin: 'https://linkedin.com/in/alex-kumar-security'
    }
  }
];