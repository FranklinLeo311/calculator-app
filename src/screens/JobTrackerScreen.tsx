import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    Linking,
    FlatList,
    ActivityIndicator,
    Clipboard,
    Share,
    RefreshControl,
} from 'react-native';
import { storageGet, storageSet } from '../utils/storage';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Job {
    id: string;
    company: string;
    role: string;
    location: string;
    type: string;
    salary: string;
    skills: string[];
    posted: string;
    applyUrl: string;
    description: string;
    color: string;
    logo: string;
    source?: string;
    isLive?: boolean;
}

interface UserProfile {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    portfolio: string;
    yearsExp: string;
    currentRole: string;
    skills: string;
    summary: string;
    education: string;
    noticePeriod: string;
    expectedSalary: string;
    currentSalary: string;
    rapidApiKey: string;
    [key: string]: string;
}

interface Application {
    jobId: string;
    company: string;
    role: string;
    appliedAt: string;
    status: 'applied' | 'shortlisted' | 'rejected' | 'interview' | 'offer';
    notes: string;
    interviewDate?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_PROFILE      = 'job_tracker_profile_v2';
const STORAGE_APPLICATIONS = 'job_tracker_applications_v1';
const STORAGE_BOOKMARKS    = 'job_tracker_bookmarks_v1';
const STORAGE_LIVE_JOBS    = 'job_tracker_live_jobs_v1';

const LOCATIONS = [
    'Chennai',
    'Bangalore',
    'Hyderabad',
    'Mumbai',
    'Pune',
    'Delhi / NCR',
    'Coimbatore',
    'Remote',
    'Other',
];

const DEFAULT_PROFILE: UserProfile = {
    fullName: 'Franklin A.',
    email: 'franklinleo311@gmail.com',
    phone: '+91 6383463958',
    location: 'Chennai, Tamil Nadu',
    linkedin: 'linkedin.com/in/franklin-a',
    github: '',
    portfolio: '',
    yearsExp: '4',
    currentRole: 'Full Stack Developer',
    skills: 'React.js, Node.js, Express.js, JavaScript (ES6+), MongoDB, MySQL, SQL Server, HTML5, CSS3, Jenkins, Nginx, CI/CD, Puppeteer, Azure Blob Storage, Git, GitHub',
    summary: 'Full Stack Developer with 4+ years of experience designing and delivering scalable web applications. Specializes in React.js frontends, Node.js backend APIs, and managing both relational and non-relational databases.',
    education: 'Bachelor of Computer Applications (BCA) — Don Bosco College, Yelagiri (2019–2022)',
    noticePeriod: '30 days',
    expectedSalary: '',
    currentSalary: '',
    rapidApiKey: '',
};

// Static seed jobs — shown when no live data is loaded yet
const STATIC_JOBS: Job[] = [
    {
        id: 's1',
        company: 'Zoho Corporation',
        role: 'Full Stack Developer',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹12L – ₹22L / yr',
        skills: ['React.js', 'Node.js', 'JavaScript', 'MongoDB', 'REST API'],
        posted: '2 days ago',
        applyUrl: 'https://careers.zoho.com',
        description: 'Build and maintain scalable web applications using React.js and Node.js. Collaborate with product teams on new features.',
        color: '#E84D1C',
        logo: 'Z',
        source: 'static',
    },
    {
        id: 's2',
        company: 'Freshworks',
        role: 'Software Engineer – Full Stack',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹15L – ₹28L / yr',
        skills: ['React.js', 'Node.js', 'MySQL', 'REST API', 'CI/CD'],
        posted: '1 day ago',
        applyUrl: 'https://careers.freshworks.com',
        description: 'Design and develop customer-facing features. Work end-to-end from frontend to backend with focus on code quality.',
        color: '#25B462',
        logo: 'F',
        source: 'static',
    },
    {
        id: 's3',
        company: 'Chargebee',
        role: 'React + Node.js Developer',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹14L – ₹24L / yr',
        skills: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'JavaScript'],
        posted: '3 days ago',
        applyUrl: 'https://www.chargebee.com/careers',
        description: 'Build subscription billing features using React and Node.js. Own features end-to-end in an Agile environment.',
        color: '#FF7557',
        logo: 'C',
        source: 'static',
    },
    {
        id: 's4',
        company: 'Infosys',
        role: 'Senior Full Stack Developer',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹10L – ₹18L / yr',
        skills: ['React.js', 'Node.js', 'SQL Server', 'Jenkins', 'IIS'],
        posted: '5 days ago',
        applyUrl: 'https://infosys.com/careers',
        description: 'Lead development of enterprise web applications. Mentor junior developers and coordinate with distributed teams.',
        color: '#007CC3',
        logo: 'I',
        source: 'static',
    },
    {
        id: 's5',
        company: 'Cognizant',
        role: 'Full Stack Engineer (React/Node)',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹10L – ₹16L / yr',
        skills: ['React.js', 'Node.js', 'Express.js', 'MySQL', 'Git'],
        posted: '4 days ago',
        applyUrl: 'https://careers.cognizant.com',
        description: 'Develop and maintain web applications for global clients. Participate in code reviews and CI/CD pipelines.',
        color: '#1D4ED8',
        logo: 'C',
        source: 'static',
    },
    {
        id: 's6',
        company: 'PayU India',
        role: 'Frontend Developer – React.js',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹14L – ₹20L / yr',
        skills: ['React.js', 'JavaScript', 'HTML5', 'CSS3', 'REST API'],
        posted: '1 week ago',
        applyUrl: 'https://corporate.payu.com/careers',
        description: 'Build responsive payment UIs using React.js. Optimize for performance and cross-browser compatibility.',
        color: '#00A0DC',
        logo: 'P',
        source: 'static',
    },
    {
        id: 's7',
        company: 'HCL Technologies',
        role: 'Node.js Backend Developer',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹9L – ₹16L / yr',
        skills: ['Node.js', 'Express.js', 'MongoDB', 'REST API', 'Jenkins'],
        posted: '6 days ago',
        applyUrl: 'https://hcltech.com/careers',
        description: 'Design and build RESTful APIs. Handle authentication and business logic with DevOps deployment.',
        color: '#0F6EB4',
        logo: 'H',
        source: 'static',
    },
    {
        id: 's8',
        company: 'Wipro',
        role: 'Full Stack Developer (MERN)',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹10L – ₹17L / yr',
        skills: ['React.js', 'Node.js', 'MongoDB', 'Express.js', 'Git'],
        posted: '3 days ago',
        applyUrl: 'https://wipro.com/careers',
        description: 'Work on MERN stack applications for enterprise clients. Write clean code and participate in agile ceremonies.',
        color: '#9333ea',
        logo: 'W',
        source: 'static',
    },
    {
        id: 's9',
        company: 'ICICI Lombard',
        role: 'Senior React Developer',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹12L – ₹20L / yr',
        skills: ['React.js', 'JavaScript', 'HTML5', 'CSS3', 'Context API'],
        posted: '2 days ago',
        applyUrl: 'https://icicilombard.com/careers',
        description: 'Lead React.js frontend development for insurance products. Build reusable component libraries.',
        color: '#D97706',
        logo: 'I',
        source: 'static',
    },
    {
        id: 's10',
        company: 'Ola Cabs',
        role: 'Full Stack Engineer',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹15L – ₹25L / yr',
        skills: ['React.js', 'Node.js', 'MongoDB', 'Azure', 'CI/CD'],
        posted: '5 days ago',
        applyUrl: 'https://ola.com/careers',
        description: 'Build scalable microservices and React frontends for high-traffic platforms. Own features from design to deployment.',
        color: '#10b981',
        logo: 'O',
        source: 'static',
    },
    {
        id: 's11',
        company: 'TCS',
        role: 'React.js Developer',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹8L – ₹14L / yr',
        skills: ['React.js', 'JavaScript', 'HTML5', 'REST API', 'SQL'],
        posted: '1 week ago',
        applyUrl: 'https://tcs.com/careers',
        description: 'Develop user interfaces for enterprise applications. Collaborate with business analysts and backend teams.',
        color: '#ef4444',
        logo: 'T',
        source: 'static',
    },
    {
        id: 's12',
        company: 'Razorpay',
        role: 'Full Stack Developer',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹18L – ₹30L / yr',
        skills: ['React.js', 'Node.js', 'MongoDB', 'Express.js', 'Automation'],
        posted: '1 day ago',
        applyUrl: 'https://razorpay.com/jobs',
        description: 'Build payment infrastructure and dashboards. Own end-to-end features in a fast-paced fintech environment.',
        color: '#3B82F6',
        logo: 'R',
        source: 'static',
    },
    {
        id: 's13',
        company: 'Juspay',
        role: 'Full Stack Developer',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹14L – ₹22L / yr',
        skills: ['React.js', 'Node.js', 'JavaScript', 'MySQL', 'Git'],
        posted: '3 days ago',
        applyUrl: 'https://juspay.in/careers',
        description: 'Develop payment orchestration features. Work on high-performance APIs serving millions of transactions.',
        color: '#06B6D4',
        logo: 'J',
        source: 'static',
    },
    {
        id: 's14',
        company: 'Quovantis',
        role: 'MERN Stack Developer',
        location: 'Chennai',
        type: 'Full-time',
        salary: '₹10L – ₹18L / yr',
        skills: ['React.js', 'Node.js', 'MongoDB', 'Express.js', 'REST API'],
        posted: '4 days ago',
        applyUrl: 'https://quovantis.com/careers',
        description: 'Join our product team to build modern web applications. Strong focus on code quality, testing, and delivery.',
        color: '#EC4899',
        logo: 'Q',
        source: 'static',
    },
    {
        id: 's15',
        company: 'NoBroker',
        role: 'Senior Full Stack Developer',
        location: 'Bangalore',
        type: 'Full-time',
        salary: '₹16L – ₹28L / yr',
        skills: ['React.js', 'Node.js', 'MongoDB', 'Nginx', 'CI/CD'],
        posted: '2 days ago',
        applyUrl: 'https://nobroker.in/careers',
        description: 'Build and scale real estate tech platform. Own microservices and React frontends for 10M+ users.',
        color: '#F59E0B',
        logo: 'N',
        source: 'static',
    },
    {
        id: 's16',
        company: 'Swiggy',
        role: 'Software Engineer – Full Stack',
        location: 'Bangalore',
        type: 'Full-time',
        salary: '₹18L – ₹32L / yr',
        skills: ['React.js', 'Node.js', 'MongoDB', 'JavaScript', 'REST API'],
        posted: '1 day ago',
        applyUrl: 'https://careers.swiggy.com',
        description: 'Build consumer-facing food delivery features at scale. Work on high-traffic systems with millions of daily active users.',
        color: '#FF5200',
        logo: 'S',
        source: 'static',
    },
    {
        id: 's17',
        company: 'Byju\'s',
        role: 'React Native + React Developer',
        location: 'Bangalore',
        type: 'Full-time',
        salary: '₹14L – ₹24L / yr',
        skills: ['React.js', 'JavaScript', 'HTML5', 'CSS3', 'Node.js'],
        posted: '5 days ago',
        applyUrl: 'https://byjus.com/careers',
        description: 'Build EdTech platform features for millions of students. Work on web and mobile applications.',
        color: '#9333ea',
        logo: 'B',
        source: 'static',
    },
    {
        id: 's18',
        company: 'Accenture',
        role: 'Full Stack Developer',
        location: 'Hyderabad',
        type: 'Full-time',
        salary: '₹10L – ₹18L / yr',
        skills: ['React.js', 'Node.js', 'SQL Server', 'Jenkins', 'Azure'],
        posted: '3 days ago',
        applyUrl: 'https://accenture.com/careers',
        description: 'Deliver digital transformation projects for global clients using modern web technologies.',
        color: '#A855F7',
        logo: 'A',
        source: 'static',
    },
    {
        id: 's19',
        company: 'Zomato',
        role: 'Node.js Engineer',
        location: 'Delhi / NCR',
        type: 'Full-time',
        salary: '₹14L – ₹26L / yr',
        skills: ['Node.js', 'Express.js', 'MongoDB', 'REST API', 'Git'],
        posted: '2 days ago',
        applyUrl: 'https://zomato.com/careers',
        description: 'Scale Node.js backend services handling millions of food orders daily. Focus on reliability and performance.',
        color: '#E23744',
        logo: 'Z',
        source: 'static',
    },
    {
        id: 's20',
        company: 'MakeMyTrip',
        role: 'Full Stack Engineer (React/Node)',
        location: 'Delhi / NCR',
        type: 'Full-time',
        salary: '₹12L – ₹22L / yr',
        skills: ['React.js', 'Node.js', 'MySQL', 'JavaScript', 'REST API'],
        posted: '4 days ago',
        applyUrl: 'https://makemytrip.com/careers',
        description: 'Build travel booking features used by millions. Work on React frontends and Node.js APIs.',
        color: '#1B5FA6',
        logo: 'M',
        source: 'static',
    },
];

const FILTER_OPTIONS = ['All', 'React.js', 'Node.js', 'Full Stack', 'MERN', 'MongoDB', 'SQL'];

const STATUS_CONFIG: Record<Application['status'], { label: string; color: string; emoji: string }> = {
    applied:     { label: 'Applied',      color: '#3B82F6', emoji: '📬' },
    shortlisted: { label: 'Shortlisted',  color: '#10b981', emoji: '✅' },
    interview:   { label: 'Interview',    color: '#F59E0B', emoji: '🗓' },
    offer:       { label: 'Offer',        color: '#8B5CF6', emoji: '🏆' },
    rejected:    { label: 'Rejected',     color: '#ef4444', emoji: '❌' },
};

const PROFILE_FIELDS: { key: keyof UserProfile; label: string; multiline?: boolean; placeholder?: string; sensitive?: boolean }[] = [
    { key: 'fullName',       label: 'Full Name' },
    { key: 'email',          label: 'Email' },
    { key: 'phone',          label: 'Phone' },
    { key: 'location',       label: 'Location' },
    { key: 'linkedin',       label: 'LinkedIn URL' },
    { key: 'github',         label: 'GitHub URL',       placeholder: 'github.com/username' },
    { key: 'portfolio',      label: 'Portfolio URL',    placeholder: 'yourportfolio.com' },
    { key: 'currentRole',    label: 'Current Role' },
    { key: 'yearsExp',       label: 'Years of Experience' },
    { key: 'currentSalary',  label: 'Current CTC (LPA)', placeholder: 'e.g. 8' },
    { key: 'expectedSalary', label: 'Expected CTC (LPA)', placeholder: 'e.g. 15' },
    { key: 'noticePeriod',   label: 'Notice Period',    placeholder: 'e.g. 30 days / Immediate' },
    { key: 'skills',         label: 'Skills',           multiline: true },
    { key: 'summary',        label: 'Professional Summary', multiline: true },
    { key: 'education',      label: 'Education',        multiline: true },
    { key: 'rapidApiKey',    label: 'RapidAPI Key (for live jobs)', placeholder: 'Get free key at rapidapi.com → JSearch', sensitive: true },
];

const LOGO_COLORS = ['#E84D1C','#25B462','#FF7557','#007CC3','#1D4ED8','#00A0DC','#0F6EB4','#9333ea','#D97706','#10b981','#ef4444','#3B82F6','#06B6D4','#EC4899','#F59E0B'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jobColor(company: string): string {
    let hash = 0;
    for (let i = 0; i < company.length; i++) hash = company.charCodeAt(i) + ((hash << 5) - hash);
    return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length];
}

function buildSearchQuery(profile: UserProfile, location: string): string {
    const locQuery = location === 'Remote' ? 'remote india' : location === 'Other' ? 'india' : location;
    return `Full Stack Developer React Node.js ${locQuery}`;
}

// Fetch live jobs from JSearch API (RapidAPI - free tier: 200 req/month)
async function fetchLiveJobs(query: string, apiKey: string): Promise<Job[]> {
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=2&page=1&date_posted=week`;
    const res = await fetch(url, {
        headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    const data: any[] = json.data ?? [];
    return data.map((item, i) => {
        const company = item.employer_name ?? 'Unknown Company';
        const color = jobColor(company);
        const skills: string[] = (item.job_required_skills ?? []).slice(0, 6);
        if (skills.length === 0) {
            ['React', 'Node.js', 'JavaScript', 'MongoDB'].forEach(s => {
                if ((item.job_description ?? '').includes(s)) skills.push(s);
            });
        }
        return {
            id: `live_${item.job_id ?? i}`,
            company,
            role: item.job_title ?? 'Developer',
            location: [item.job_city, item.job_country].filter(Boolean).join(', '),
            type: item.job_employment_type ?? 'Full-time',
            salary: item.job_min_salary && item.job_max_salary
                ? `${item.job_min_salary}–${item.job_max_salary} ${item.job_salary_currency ?? ''}`
                : 'Not disclosed',
            skills: skills.length > 0 ? skills : ['React.js', 'JavaScript'],
            posted: item.job_posted_at_datetime_utc ? relativeDate(item.job_posted_at_datetime_utc) : 'Recently',
            applyUrl: item.job_apply_link ?? item.job_google_link ?? 'https://www.google.com/search?q=' + encodeURIComponent(company + ' jobs'),
            description: (item.job_description ?? '').slice(0, 300).trim() + '...',
            color,
            logo: company.charAt(0).toUpperCase(),
            source: 'live',
            isLive: true,
        } as Job;
    });
}

function relativeDate(iso: string): string {
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        if (days < 7) return `${days} days ago`;
        return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''} ago`;
    } catch {
        return 'Recently';
    }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function JobTrackerScreen() {
    const [profile, setProfile]           = useState<UserProfile>(DEFAULT_PROFILE);
    const [applications, setApplications] = useState<Application[]>([]);
    const [bookmarks, setBookmarks]       = useState<string[]>([]);
    const [liveJobs, setLiveJobs]         = useState<Job[]>([]);
    const [activeTab, setActiveTab]       = useState<'jobs' | 'applied' | 'saved' | 'profile'>('jobs');
    const [filterSkill, setFilterSkill]   = useState('All');
    const [filterType, setFilterType]     = useState('All');
    const [searchQuery, setSearchQuery]   = useState('');
    const [selectedLocation, setSelectedLocation] = useState('Chennai');
    const [customLocation, setCustomLocation]     = useState('');
    const [locationModal, setLocationModal]       = useState(false);
    const [applyModal, setApplyModal]     = useState<Job | null>(null);
    const [profileModal, setProfileModal] = useState(false);
    const [editProfile, setEditProfile]   = useState<UserProfile>(DEFAULT_PROFILE);
    const [saving, setSaving]             = useState(false);
    const [appStatusModal, setAppStatusModal] = useState<Application | null>(null);
    const [refreshing, setRefreshing]     = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState<string>('');
    const [refreshStatus, setRefreshStatus] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [savedProfile, savedApps, savedBookmarks, savedLiveJobs] = await Promise.all([
            storageGet<UserProfile>(STORAGE_PROFILE),
            storageGet<Application[]>(STORAGE_APPLICATIONS),
            storageGet<string[]>(STORAGE_BOOKMARKS),
            storageGet<Job[]>(STORAGE_LIVE_JOBS),
        ]);
        if (savedProfile)   setProfile(savedProfile);
        if (savedApps)      setApplications(savedApps);
        if (savedBookmarks) setBookmarks(savedBookmarks);
        if (savedLiveJobs && savedLiveJobs.length > 0) setLiveJobs(savedLiveJobs);
    };

    const saveProfile = async (p: UserProfile) => {
        setSaving(true);
        await storageSet(STORAGE_PROFILE, p);
        setProfile(p);
        setSaving(false);
    };

    const saveApplications = async (apps: Application[]) => {
        await storageSet(STORAGE_APPLICATIONS, apps);
        setApplications(apps);
    };

    const toggleBookmark = async (jobId: string) => {
        const updated = bookmarks.includes(jobId)
            ? bookmarks.filter(id => id !== jobId)
            : [...bookmarks, jobId];
        await storageSet(STORAGE_BOOKMARKS, updated);
        setBookmarks(updated);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setRefreshStatus('🔍 Searching for live jobs...');
        const loc = selectedLocation === 'Other' ? customLocation : selectedLocation;

        if (!profile.rapidApiKey) {
            setRefreshing(false);
            setRefreshStatus('');
            Alert.alert(
                'API Key Required',
                'To fetch live jobs, add your free RapidAPI key in Profile → Edit.\n\n1. Go to rapidapi.com\n2. Search "JSearch"\n3. Subscribe to free plan (200 req/month)\n4. Copy your API key\n\nFor now, showing curated static listings.',
                [{ text: 'Go to Profile', onPress: () => { setActiveTab('profile'); setEditProfile({ ...profile }); setProfileModal(true); } }, { text: 'OK' }]
            );
            return;
        }

        try {
            setRefreshStatus('⚡ Fetching from job boards...');
            const query = buildSearchQuery(profile, loc);
            const jobs = await fetchLiveJobs(query, profile.rapidApiKey);
            if (jobs.length === 0) {
                setRefreshStatus('');
                Alert.alert('No results', 'No live jobs found for this search. Showing saved listings.');
            } else {
                await storageSet(STORAGE_LIVE_JOBS, jobs);
                setLiveJobs(jobs);
                const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                setLastRefreshed(now);
                setRefreshStatus(`✅ ${jobs.length} live jobs loaded`);
                setTimeout(() => setRefreshStatus(''), 3000);
            }
        } catch (e: any) {
            setRefreshStatus('');
            Alert.alert('Fetch Failed', `Could not load live jobs: ${e.message}\n\nShowing static listings.`);
        } finally {
            setRefreshing(false);
        }
    };

    const skillMatch = useCallback((job: Job): number => {
        const userSkills = profile.skills.toLowerCase().split(',').map(s => s.trim());
        const matched = job.skills.filter(s =>
            userSkills.some(u => u.includes(s.toLowerCase()) || s.toLowerCase().includes(u))
        );
        return Math.round((matched.length / Math.max(job.skills.length, 1)) * 100);
    }, [profile.skills]);

    const displayLocation = selectedLocation === 'Other' ? (customLocation || 'Other') : selectedLocation;

    const allJobs: Job[] = liveJobs.length > 0
        ? [...liveJobs, ...STATIC_JOBS.filter(j => !liveJobs.find(l => l.company === j.company && l.role === j.role))]
        : STATIC_JOBS;

    const filteredJobs = allJobs.filter(job => {
        const locMatch = selectedLocation === 'Other'
            ? true
            : job.location.toLowerCase().includes(displayLocation.toLowerCase()) ||
              (selectedLocation === 'Remote' && job.type.toLowerCase().includes('remote'));
        const skillFilter = filterSkill === 'All' || job.skills.some(s => s.toLowerCase().includes(filterSkill.toLowerCase())) || job.role.toLowerCase().includes(filterSkill.toLowerCase());
        const typeFilter  = filterType  === 'All' || job.type.includes(filterType);
        const search = searchQuery === '' ||
            job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
        return locMatch && skillFilter && typeFilter && search;
    }).sort((a, b) => {
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        return skillMatch(b) - skillMatch(a);
    });

    const isApplied  = (jobId: string) => applications.some(a => a.jobId === jobId);
    const isBookmark = (jobId: string) => bookmarks.includes(jobId);

    const handleApply = async (job: Job) => {
        if (isApplied(job.id)) {
            Alert.alert('Already Applied', `Already tracking ${job.company}.`);
            return;
        }
        const newApp: Application = {
            jobId: job.id,
            company: job.company,
            role: job.role,
            appliedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            status: 'applied',
            notes: '',
        };
        await saveApplications([newApp, ...applications]);
        setApplyModal(null);
        Alert.alert(
            '📬 Tracked!',
            `${job.company} added to your tracker.`,
            [
                { text: 'Open Job URL', onPress: () => Linking.openURL(job.applyUrl) },
                { text: 'OK' },
            ]
        );
    };

    const handleUpdateStatus = async (app: Application, status: Application['status'], notes: string, interviewDate: string) => {
        const updated = applications.map(a =>
            a.jobId === app.jobId ? { ...a, status, notes, interviewDate } : a
        );
        await saveApplications(updated);
        setAppStatusModal(null);
    };

    const handleDeleteApp = async (jobId: string) => {
        Alert.alert('Remove', 'Remove this application from tracker?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: async () => saveApplications(applications.filter(a => a.jobId !== jobId)) },
        ]);
    };

    const savedJobs = allJobs.filter(j => isBookmark(j.id));

    const statsCount = {
        total:       applications.length,
        shortlisted: applications.filter(a => a.status === 'shortlisted' || a.status === 'interview').length,
        offers:      applications.filter(a => a.status === 'offer').length,
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>💼 Job Tracker</Text>
                    <TouchableOpacity style={styles.locationRow} onPress={() => setLocationModal(true)}>
                        <Text style={styles.locationText}>📍 {displayLocation}</Text>
                        <Text style={styles.locationChevron}>▼</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={[styles.iconBtn, refreshing && styles.iconBtnActive]} onPress={handleRefresh} disabled={refreshing}>
                        {refreshing
                            ? <ActivityIndicator size="small" color={Colors.accent} />
                            : <Text style={styles.iconBtnText}>🔄</Text>
                        }
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.profileBtn} onPress={() => { setEditProfile({ ...profile }); setProfileModal(true); }}>
                        <Text style={styles.profileBtnText}>👤</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Refresh status */}
            {refreshStatus !== '' && (
                <View style={styles.refreshBanner}>
                    <Text style={styles.refreshBannerText}>{refreshStatus}</Text>
                </View>
            )}
            {lastRefreshed !== '' && refreshStatus === '' && liveJobs.length > 0 && (
                <View style={styles.liveBanner}>
                    <Text style={styles.liveBannerText}>⚡ {liveJobs.length} live jobs • refreshed {lastRefreshed}</Text>
                </View>
            )}

            {/* Stats */}
            <View style={styles.statsBar}>
                <StatChip icon="🔍" label="Jobs"      value={filteredJobs.length} color="#F59E0B" />
                <StatChip icon="📬" label="Applied"   value={statsCount.total}    color="#3B82F6" />
                <StatChip icon="✅" label="Active"    value={statsCount.shortlisted} color="#10b981" />
                <StatChip icon="🏆" label="Offers"    value={statsCount.offers}   color="#8B5CF6" />
            </View>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
                {([
                    { key: 'jobs',    label: `🔍 Jobs (${filteredJobs.length})` },
                    { key: 'applied', label: `📬 Applied (${applications.length})` },
                    { key: 'saved',   label: `🔖 Saved (${savedJobs.length})` },
                    { key: 'profile', label: '👤 Profile' },
                ] as const).map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Content */}
            {activeTab === 'jobs' && (
                <JobsTab
                    jobs={filteredJobs}
                    filterSkill={filterSkill}
                    setFilterSkill={setFilterSkill}
                    filterType={filterType}
                    setFilterType={setFilterType}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    skillMatch={skillMatch}
                    isApplied={isApplied}
                    isBookmark={isBookmark}
                    onApply={setApplyModal}
                    onToggleBookmark={toggleBookmark}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                />
            )}
            {activeTab === 'applied' && (
                <AppliedTab
                    applications={applications}
                    onUpdateStatus={setAppStatusModal}
                    onDelete={handleDeleteApp}
                    onOpenJob={jobId => {
                        const job = allJobs.find(j => j.id === jobId);
                        if (job) Linking.openURL(job.applyUrl);
                    }}
                />
            )}
            {activeTab === 'saved' && (
                <SavedTab
                    jobs={savedJobs}
                    skillMatch={skillMatch}
                    isApplied={isApplied}
                    onApply={setApplyModal}
                    onRemove={toggleBookmark}
                />
            )}
            {activeTab === 'profile' && (
                <ProfileTab
                    profile={profile}
                    onEdit={() => { setEditProfile({ ...profile }); setProfileModal(true); }}
                />
            )}

            {/* Modals */}
            {applyModal && (
                <ApplyModal
                    job={applyModal}
                    profile={profile}
                    skillMatch={skillMatch(applyModal)}
                    onApply={() => handleApply(applyModal)}
                    onClose={() => setApplyModal(null)}
                    onOpenUrl={() => Linking.openURL(applyModal.applyUrl)}
                />
            )}

            <ProfileEditModal
                visible={profileModal}
                profile={editProfile}
                saving={saving}
                onChange={setEditProfile}
                onSave={async () => { await saveProfile(editProfile); setProfileModal(false); }}
                onClose={() => setProfileModal(false)}
            />

            {appStatusModal && (
                <StatusUpdateModal
                    app={appStatusModal}
                    onSave={handleUpdateStatus}
                    onClose={() => setAppStatusModal(null)}
                />
            )}

            <LocationModal
                visible={locationModal}
                selected={selectedLocation}
                customLocation={customLocation}
                onSelect={loc => { setSelectedLocation(loc); if (loc !== 'Other') setLocationModal(false); }}
                onCustomChange={setCustomLocation}
                onConfirm={() => setLocationModal(false)}
                onClose={() => setLocationModal(false)}
            />
        </View>
    );
}

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

function JobsTab({ jobs, filterSkill, setFilterSkill, filterType, setFilterType, searchQuery, setSearchQuery, skillMatch, isApplied, isBookmark, onApply, onToggleBookmark, onRefresh, refreshing }: {
    jobs: Job[];
    filterSkill: string; setFilterSkill: (v: string) => void;
    filterType: string;  setFilterType: (v: string) => void;
    searchQuery: string; setSearchQuery: (v: string) => void;
    skillMatch: (job: Job) => number;
    isApplied: (id: string) => boolean;
    isBookmark: (id: string) => boolean;
    onApply: (job: Job) => void;
    onToggleBookmark: (id: string) => void;
    onRefresh: () => void;
    refreshing: boolean;
}) {
    return (
        <View style={{ flex: 1 }}>
            <View style={styles.searchRow}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search company, role, skill..."
                    placeholderTextColor={Colors.text.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 14 }}>
                {FILTER_OPTIONS.map(f => (
                    <TouchableOpacity key={f} style={[styles.filterChip, filterSkill === f && styles.filterChipActive]} onPress={() => setFilterSkill(f)}>
                        <Text style={[styles.filterChipText, filterSkill === f && styles.filterChipTextActive]}>{f}</Text>
                    </TouchableOpacity>
                ))}
                <View style={styles.filterDivider} />
                {['All', 'Full-time', 'Contract', 'Remote'].map(t => (
                    <TouchableOpacity key={t} style={[styles.filterChip, styles.filterChipType, filterType === t && styles.filterChipActive]} onPress={() => setFilterType(t)}>
                        <Text style={[styles.filterChipText, filterType === t && styles.filterChipTextActive]}>{t === 'All' ? '⏱ All Types' : t}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {jobs.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🔍</Text>
                    <Text style={styles.emptyTitle}>No jobs found</Text>
                    <Text style={styles.emptyText}>Try a different location or skill filter</Text>
                    <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16, paddingHorizontal: 24 }]} onPress={onRefresh} disabled={refreshing}>
                        <Text style={styles.primaryBtnText}>{refreshing ? 'Refreshing...' : '🔄 Refresh Jobs'}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={jobs}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
                    renderItem={({ item }) => (
                        <JobCard
                            job={item}
                            match={skillMatch(item)}
                            applied={isApplied(item.id)}
                            bookmarked={isBookmark(item.id)}
                            onApply={() => onApply(item)}
                            onBookmark={() => onToggleBookmark(item.id)}
                        />
                    )}
                />
            )}
        </View>
    );
}

function JobCard({ job, match, applied, bookmarked, onApply, onBookmark }: {
    job: Job; match: number; applied: boolean; bookmarked: boolean;
    onApply: () => void; onBookmark: () => void;
}) {
    return (
        <View style={[styles.card, styles.jobCard]}>
            <View style={styles.jobHeader}>
                <View style={[styles.logoCircle, { backgroundColor: job.color + '22' }]}>
                    <Text style={[styles.logoText, { color: job.color }]}>{job.logo}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={styles.jobTitleRow}>
                        <Text style={styles.jobRole} numberOfLines={1}>{job.role}</Text>
                        {job.isLive && <View style={styles.liveDot}><Text style={styles.liveDotText}>LIVE</Text></View>}
                    </View>
                    <Text style={styles.jobCompany}>{job.company}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.matchBadge, { backgroundColor: match >= 80 ? '#10b98122' : match >= 60 ? '#F59E0B22' : '#ef444422' }]}>
                        <Text style={[styles.matchText, { color: match >= 80 ? '#10b981' : match >= 60 ? '#F59E0B' : '#ef4444' }]}>{match}%</Text>
                    </View>
                    <TouchableOpacity onPress={onBookmark}>
                        <Text style={{ fontSize: 18 }}>{bookmarked ? '🔖' : '🤍'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.jobMeta}>
                <Text style={styles.metaChip}>📍 {job.location}</Text>
                <Text style={styles.metaChip}>💰 {job.salary}</Text>
                <Text style={styles.metaChip}>⏰ {job.posted}</Text>
                <Text style={styles.metaChip}>🏷 {job.type}</Text>
            </View>

            <View style={styles.skillsRow}>
                {job.skills.slice(0, 4).map(s => (
                    <View key={s} style={styles.skillChip}>
                        <Text style={styles.skillChipText}>{s}</Text>
                    </View>
                ))}
                {job.skills.length > 4 && <Text style={styles.moreSkills}>+{job.skills.length - 4}</Text>}
            </View>

            <Text style={styles.jobDesc} numberOfLines={2}>{job.description}</Text>

            <View style={styles.jobActions}>
                <TouchableOpacity style={[styles.applyBtn, applied && styles.applyBtnApplied, { flex: 1 }]} onPress={onApply}>
                    <Text style={styles.applyBtnText}>{applied ? '✓ Applied' : '🚀 Quick Apply'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={() => Share.share({ message: `Check this job: ${job.role} at ${job.company}\n${job.applyUrl}` })}
                >
                    <Text style={styles.shareBtnText}>↗</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Saved Tab ────────────────────────────────────────────────────────────────

function SavedTab({ jobs, skillMatch, isApplied, onApply, onRemove }: {
    jobs: Job[]; skillMatch: (j: Job) => number;
    isApplied: (id: string) => boolean;
    onApply: (j: Job) => void; onRemove: (id: string) => void;
}) {
    if (jobs.length === 0) {
        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔖</Text>
                <Text style={styles.emptyTitle}>No saved jobs</Text>
                <Text style={styles.emptyText}>Tap 🤍 on any job to save it for later</Text>
            </View>
        );
    }
    return (
        <FlatList
            data={jobs}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
                <JobCard
                    job={item}
                    match={skillMatch(item)}
                    applied={isApplied(item.id)}
                    bookmarked
                    onApply={() => onApply(item)}
                    onBookmark={() => onRemove(item.id)}
                />
            )}
        />
    );
}

// ─── Applied Tab ──────────────────────────────────────────────────────────────

function AppliedTab({ applications, onUpdateStatus, onDelete, onOpenJob }: {
    applications: Application[];
    onUpdateStatus: (app: Application) => void;
    onDelete: (jobId: string) => void;
    onOpenJob: (jobId: string) => void;
}) {
    const byStatus = (s: Application['status']) => applications.filter(a => a.status === s).length;

    if (applications.length === 0) {
        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📬</Text>
                <Text style={styles.emptyTitle}>No applications yet</Text>
                <Text style={styles.emptyText}>Use Quick Apply on any job to start tracking</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 60 }} contentContainerStyle={{ padding: 12, gap: 8 }}>
                {(Object.entries(STATUS_CONFIG) as [Application['status'], typeof STATUS_CONFIG[Application['status']]][]).map(([key, cfg]) => (
                    <View key={key} style={[styles.statusSummary, { backgroundColor: cfg.color + '18' }]}>
                        <Text style={{ fontSize: 14 }}>{cfg.emoji}</Text>
                        <Text style={[styles.statusSummaryCount, { color: cfg.color }]}>{byStatus(key)}</Text>
                        <Text style={styles.statusSummaryLabel}>{cfg.label}</Text>
                    </View>
                ))}
            </ScrollView>
            <FlatList
                data={applications}
                keyExtractor={item => item.jobId}
                contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const cfg = STATUS_CONFIG[item.status];
                    return (
                        <View style={[styles.card, styles.appCard]}>
                            <View style={styles.appCardTop}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.appCompany}>{item.company}</Text>
                                    <Text style={styles.appRole}>{item.role}</Text>
                                    <Text style={styles.appDate}>📅 Applied: {item.appliedAt}</Text>
                                    {item.interviewDate ? <Text style={styles.appDate}>🗓 Interview: {item.interviewDate}</Text> : null}
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22' }]}>
                                    <Text style={{ fontSize: 14 }}>{cfg.emoji}</Text>
                                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                </View>
                            </View>
                            {item.notes ? <Text style={styles.appNotes}>💬 {item.notes}</Text> : null}
                            <View style={styles.appActions}>
                                <TouchableOpacity style={styles.appActionBtn} onPress={() => onUpdateStatus(item)}>
                                    <Text style={styles.appActionText}>📝 Update</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.appActionBtn} onPress={() => onOpenJob(item.jobId)}>
                                    <Text style={styles.appActionText}>🔗 URL</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.appActionBtn, styles.appActionDanger]} onPress={() => onDelete(item.jobId)}>
                                    <Text style={styles.appActionDangerText}>🗑</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ profile, onEdit }: { profile: UserProfile; onEdit: () => void }) {
    const completionFields: (keyof UserProfile)[] = ['fullName','email','phone','linkedin','github','portfolio','currentSalary','expectedSalary','noticePeriod','rapidApiKey'];
    const filled = completionFields.filter(k => !!profile[k]).length;
    const pct = Math.round((filled / completionFields.length) * 100);

    return (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            <View style={[styles.card, { marginBottom: 16 }]}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{profile.fullName.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.profileName}>{profile.fullName}</Text>
                        <Text style={styles.profileRole}>{profile.currentRole}</Text>
                        <Text style={styles.profileLocationText}>📍 {profile.location}</Text>
                    </View>
                    <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
                        <Text style={styles.editBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.completionRow}>
                    <Text style={styles.completionLabel}>Profile {pct}% complete</Text>
                    <View style={styles.completionBar}>
                        <View style={[styles.completionFill, { width: `${pct}%` as any }]} />
                    </View>
                </View>
                {pct < 100 && <Text style={styles.completionHint}>Add {completionFields.filter(k => !profile[k]).slice(0, 2).join(', ')} to improve auto-fill accuracy</Text>}
            </View>

            <ProfileSection title="Contact">
                <ProfileRow icon="✉️" value={profile.email} />
                <ProfileRow icon="📱" value={profile.phone} />
                <ProfileRow icon="🔗" value={profile.linkedin || 'Not set'} muted={!profile.linkedin} />
                <ProfileRow icon="💻" value={profile.github || 'Not set'} muted={!profile.github} />
                <ProfileRow icon="🌐" value={profile.portfolio || 'Not set'} muted={!profile.portfolio} />
            </ProfileSection>

            <ProfileSection title="Career">
                <ProfileRow label="Experience"    value={`${profile.yearsExp} years`} />
                <ProfileRow label="Notice Period"  value={profile.noticePeriod || 'Not set'} muted={!profile.noticePeriod} />
                <ProfileRow label="Current CTC"   value={profile.currentSalary ? `₹${profile.currentSalary}L` : 'Not set'} muted={!profile.currentSalary} />
                <ProfileRow label="Expected CTC"  value={profile.expectedSalary ? `₹${profile.expectedSalary}L` : 'Not set'} muted={!profile.expectedSalary} />
                <ProfileRow label="Live Jobs API" value={profile.rapidApiKey ? '✅ Configured' : '⚠️ Not set (add for live jobs)'} muted={!profile.rapidApiKey} />
            </ProfileSection>

            <ProfileSection title="Skills">
                <Text style={styles.skillsBlock}>{profile.skills}</Text>
            </ProfileSection>

            <ProfileSection title="Summary">
                <Text style={styles.summaryText}>{profile.summary}</Text>
            </ProfileSection>

            <ProfileSection title="Education">
                <Text style={styles.summaryText}>{profile.education}</Text>
            </ProfileSection>
        </ScrollView>
    );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={[styles.card, { marginBottom: 12 }]}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

function ProfileRow({ icon, label, value, muted }: { icon?: string; label?: string; value: string; muted?: boolean }) {
    return (
        <View style={styles.profileRow}>
            {icon  ? <Text style={styles.profileRowIcon}>{icon}</Text>   : null}
            {label ? <Text style={styles.profileRowLabel}>{label}</Text> : null}
            <Text style={[styles.profileRowValue, muted && styles.profileRowMuted]} numberOfLines={2}>{value}</Text>
        </View>
    );
}

// ─── Apply Modal ──────────────────────────────────────────────────────────────

function ApplyModal({ job, profile, skillMatch, onApply, onClose, onOpenUrl }: {
    job: Job; profile: UserProfile; skillMatch: number;
    onApply: () => void; onClose: () => void; onOpenUrl: () => void;
}) {
    const fields = [
        { label: 'Full Name',     value: profile.fullName },
        { label: 'Email',         value: profile.email },
        { label: 'Phone',         value: profile.phone },
        { label: 'Location',      value: profile.location },
        { label: 'LinkedIn',      value: profile.linkedin },
        { label: 'GitHub',        value: profile.github || '—' },
        { label: 'Current Role',  value: profile.currentRole },
        { label: 'Experience',    value: `${profile.yearsExp} years` },
        { label: 'Current CTC',   value: profile.currentSalary ? `₹${profile.currentSalary}L` : '⚠️ Add in profile' },
        { label: 'Expected CTC',  value: profile.expectedSalary ? `₹${profile.expectedSalary}L` : '⚠️ Add in profile' },
        { label: 'Notice Period', value: profile.noticePeriod },
        { label: 'Skills',        value: profile.skills },
    ];

    const coverLetter = `Dear Hiring Team at ${job.company},

I am excited to apply for the ${job.role} position. With ${profile.yearsExp}+ years of full stack experience, I bring hands-on expertise in ${job.skills.slice(0, 3).join(', ')} — directly aligned with your requirements.

At LoanDNA, I designed RESTful APIs, built responsive React.js UIs, managed CI/CD pipelines with Jenkins, and mentored junior developers. I take ownership end-to-end and thrive in fast-paced environments.

I look forward to discussing how I can contribute to ${job.company}.

Best regards,
${profile.fullName}
${profile.phone} | ${profile.email}`;

    const missingFields = fields.filter(f => f.value.startsWith('⚠️'));

    return (
        <Modal visible animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalSheet}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{job.role}</Text>
                            <Text style={styles.modalSub}>{job.company} • {job.salary}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.matchBanner, { backgroundColor: skillMatch >= 80 ? '#10b98120' : '#F59E0B20' }]}>
                        <Text style={[styles.matchBannerText, { color: skillMatch >= 80 ? '#10b981' : '#F59E0B' }]}>
                            {skillMatch}% skill match — {skillMatch >= 80 ? 'Strong fit 🎯' : skillMatch >= 60 ? 'Good fit 👍' : 'Partial fit'}
                        </Text>
                    </View>

                    {missingFields.length > 0 && (
                        <View style={styles.warningBanner}>
                            <Text style={styles.warningText}>⚠️ Missing: {missingFields.map(f => f.label).join(', ')} — edit your profile to auto-fill</Text>
                        </View>
                    )}

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                        <View style={styles.autoFillHeader}>
                            <Text style={styles.sectionLabel}>Auto-filled from your profile</Text>
                            <TouchableOpacity onPress={() => {
                                const text = fields.map(f => `${f.label}: ${f.value}`).join('\n');
                                Clipboard.setString(text);
                                Alert.alert('Copied!', 'All details copied to clipboard.');
                            }}>
                                <Text style={styles.copyBtn}>📋 Copy All</Text>
                            </TouchableOpacity>
                        </View>

                        {fields.map(f => (
                            <View key={f.label} style={styles.autoFillRow}>
                                <Text style={styles.autoFillLabel}>{f.label}</Text>
                                <Text style={[styles.autoFillValue, f.value.startsWith('⚠️') && { color: '#F59E0B' }]} numberOfLines={3}>{f.value}</Text>
                            </View>
                        ))}

                        <View style={styles.autoFillHeader}>
                            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Generated Cover Letter</Text>
                            <TouchableOpacity onPress={() => { Clipboard.setString(coverLetter); Alert.alert('Copied!', 'Cover letter copied.'); }}>
                                <Text style={styles.copyBtn}>📋 Copy</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.coverLetterBox}>
                            <Text style={styles.coverLetterText}>{coverLetter}</Text>
                        </View>

                        <Text style={styles.applyNote}>
                            💡 Open the job URL, paste the copied details into the application form. Tap "Track" to save this to your application tracker.
                        </Text>

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={onOpenUrl}>
                                <Text style={styles.primaryBtnText}>🔗 Open URL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: '#10b981' }]} onPress={onApply}>
                                <Text style={styles.primaryBtnText}>📬 Track</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// ─── Location Modal ───────────────────────────────────────────────────────────

function LocationModal({ visible, selected, customLocation, onSelect, onCustomChange, onConfirm, onClose }: {
    visible: boolean; selected: string; customLocation: string;
    onSelect: (loc: string) => void; onCustomChange: (v: string) => void;
    onConfirm: () => void; onClose: () => void;
}) {
    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalSheet, { maxHeight: '70%' }]}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Location</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                        {LOCATIONS.map(loc => (
                            <TouchableOpacity
                                key={loc}
                                style={[styles.locationOption, selected === loc && styles.locationOptionActive]}
                                onPress={() => onSelect(loc)}
                            >
                                <Text style={styles.locationOptionIcon}>{loc === 'Remote' ? '🌐' : loc === 'Other' ? '✏️' : '📍'}</Text>
                                <Text style={[styles.locationOptionText, selected === loc && { color: Colors.accent }]}>{loc}</Text>
                                {selected === loc && <Text style={styles.locationCheck}>✓</Text>}
                            </TouchableOpacity>
                        ))}

                        {selected === 'Other' && (
                            <View style={[styles.fieldGroup, { marginHorizontal: 4 }]}>
                                <Text style={styles.fieldLabel}>Enter city / region</Text>
                                <TextInput
                                    style={styles.fieldInput}
                                    value={customLocation}
                                    onChangeText={onCustomChange}
                                    placeholder="e.g. Kochi, Kolkata, Singapore"
                                    placeholderTextColor={Colors.text.muted}
                                    autoFocus
                                />
                            </View>
                        )}

                        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={onConfirm}>
                            <Text style={styles.primaryBtnText}>✅ Confirm Location</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// ─── Profile Edit Modal ───────────────────────────────────────────────────────

function ProfileEditModal({ visible, profile, saving, onChange, onSave, onClose }: {
    visible: boolean; profile: UserProfile; saving: boolean;
    onChange: (p: UserProfile) => void; onSave: () => void; onClose: () => void;
}) {
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalSheet, { height: '95%' }]}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.profileNote}>
                        <Text style={styles.profileNoteText}>📝 All fields are saved and auto-filled in future applications</Text>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        {PROFILE_FIELDS.map(field => (
                            <View key={String(field.key)} style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>{field.label}</Text>
                                <TextInput
                                    style={[styles.fieldInput, field.multiline && styles.fieldInputMulti]}
                                    value={profile[field.key]}
                                    onChangeText={val => onChange({ ...profile, [field.key]: val })}
                                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                                    placeholderTextColor={Colors.text.muted}
                                    multiline={field.multiline}
                                    numberOfLines={field.multiline ? 3 : 1}
                                    secureTextEntry={field.sensitive}
                                />
                                {field.key === 'rapidApiKey' && (
                                    <Text style={styles.fieldHint}>Free at rapidapi.com → search "JSearch" → subscribe free plan (200 req/month)</Text>
                                )}
                            </View>
                        ))}
                        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={onSave} disabled={saving}>
                            {saving
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.primaryBtnText}>💾 Save Profile</Text>
                            }
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// ─── Status Update Modal ──────────────────────────────────────────────────────

function StatusUpdateModal({ app, onSave, onClose }: {
    app: Application;
    onSave: (app: Application, status: Application['status'], notes: string, interviewDate: string) => void;
    onClose: () => void;
}) {
    const [status, setStatus]             = useState<Application['status']>(app.status);
    const [notes, setNotes]               = useState(app.notes);
    const [interviewDate, setInterviewDate] = useState(app.interviewDate ?? '');

    return (
        <Modal visible animationType="fade" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalSheet, { maxHeight: '75%' }]}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle}>{app.company}</Text>
                            <Text style={styles.modalSub}>{app.role}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                        <Text style={styles.fieldLabel}>Application Status</Text>
                        <View style={styles.statusGrid}>
                            {(Object.entries(STATUS_CONFIG) as [Application['status'], typeof STATUS_CONFIG[Application['status']]][]).map(([s, cfg]) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.statusOption, status === s && { backgroundColor: cfg.color + '33', borderColor: cfg.color }]}
                                    onPress={() => setStatus(s)}
                                >
                                    <Text style={{ fontSize: 16 }}>{cfg.emoji}</Text>
                                    <Text style={[styles.statusOptionText, { color: status === s ? cfg.color : Colors.text.secondary }]}>{cfg.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {(status === 'interview' || status === 'shortlisted') && (
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Interview Date</Text>
                                <TextInput
                                    style={styles.fieldInput}
                                    value={interviewDate}
                                    onChangeText={setInterviewDate}
                                    placeholder="e.g. 15 Jun 2025, 10:00 AM"
                                    placeholderTextColor={Colors.text.muted}
                                />
                            </View>
                        )}

                        <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Notes / Feedback</Text>
                        <TextInput
                            style={[styles.fieldInput, styles.fieldInputMulti]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="HR name, interview feedback, follow-up date..."
                            placeholderTextColor={Colors.text.muted}
                            multiline
                            numberOfLines={4}
                        />

                        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} onPress={() => onSave(app, status, notes, interviewDate)}>
                            <Text style={styles.primaryBtnText}>💾 Save</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────

function StatChip({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
    return (
        <View style={[styles.statChip, { backgroundColor: color + '18' }]}>
            <Text style={styles.statIcon}>{icon}</Text>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
    headerTitle: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    locationText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '600' },
    locationChevron: { color: Colors.accent, fontSize: 10, marginLeft: 4 },
    headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
    iconBtnActive: { borderColor: Colors.accent },
    iconBtnText: { fontSize: 16 },
    profileBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.accent + '40' },
    profileBtnText: { fontSize: 16 },

    refreshBanner: { backgroundColor: '#3B82F620', marginHorizontal: 14, borderRadius: Radii.md, padding: 8, marginBottom: 6 },
    refreshBannerText: { color: '#3B82F6', fontSize: FontSize.xs, fontWeight: '600', textAlign: 'center' },
    liveBanner: { backgroundColor: '#10b98115', marginHorizontal: 14, borderRadius: Radii.md, padding: 6, marginBottom: 6 },
    liveBannerText: { color: '#10b981', fontSize: FontSize.xs, textAlign: 'center' },

    statsBar: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
    statChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radii.md },
    statIcon: { fontSize: 14 },
    statValue: { fontSize: FontSize.md, fontWeight: '700', marginTop: 2 },
    statLabel: { color: Colors.text.secondary, fontSize: 9, marginTop: 1 },

    tabScroll: { maxHeight: 46, marginBottom: 8 },
    tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, height: 34, justifyContent: 'center' },
    tabActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent + '60' },
    tabText: { color: Colors.text.secondary, fontSize: 11, fontWeight: '600' },
    tabTextActive: { color: Colors.accent },

    searchRow: { paddingHorizontal: 14, paddingBottom: 8 },
    searchInput: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: Radii.lg, paddingHorizontal: 14, paddingVertical: 10, color: Colors.text.primary, fontSize: FontSize.sm },

    filterScroll: { maxHeight: 42, marginBottom: 8 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, marginRight: 6, height: 30, justifyContent: 'center' },
    filterChipType: { borderStyle: 'dashed' },
    filterChipActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
    filterChipText: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },
    filterChipTextActive: { color: Colors.accent },
    filterDivider: { width: 1, backgroundColor: Colors.divider, marginHorizontal: 6, alignSelf: 'stretch' },

    card: { backgroundColor: Colors.card, borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.cardBorder, padding: 14, marginBottom: 12 },
    jobCard: {},
    jobHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    logoCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    logoText: { fontSize: 18, fontWeight: '800' },
    jobTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    jobRole: { color: Colors.text.primary, fontSize: FontSize.md, fontWeight: '700', flex: 1 },
    liveDot: { backgroundColor: '#10b98122', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    liveDotText: { color: '#10b981', fontSize: 9, fontWeight: '800' },
    jobCompany: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 1 },
    matchBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radii.md },
    matchText: { fontSize: FontSize.xs, fontWeight: '700' },
    jobMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    metaChip: { color: Colors.text.secondary, fontSize: FontSize.xs },
    skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    skillChip: { backgroundColor: Colors.accentSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    skillChipText: { color: Colors.accent, fontSize: 10, fontWeight: '600' },
    moreSkills: { color: Colors.text.muted, fontSize: 10, alignSelf: 'center' },
    jobDesc: { color: Colors.text.secondary, fontSize: FontSize.xs, lineHeight: 18, marginBottom: 12 },
    jobActions: { flexDirection: 'row', gap: 8 },
    applyBtn: { backgroundColor: Colors.accent, borderRadius: Radii.md, paddingVertical: 10, alignItems: 'center' },
    applyBtnApplied: { backgroundColor: '#10b98133', borderWidth: 1, borderColor: '#10b981' },
    applyBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
    shareBtn: { width: 40, height: 40, backgroundColor: Colors.surface, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
    shareBtnText: { color: Colors.text.secondary, fontSize: 18, fontWeight: '700' },

    appCard: {},
    appCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    appCompany: { color: Colors.text.primary, fontSize: FontSize.md, fontWeight: '700' },
    appRole: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 2 },
    appDate: { color: Colors.text.muted, fontSize: FontSize.xs, marginTop: 3 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radii.md, alignItems: 'center', gap: 2 },
    statusText: { fontSize: FontSize.xs, fontWeight: '700' },
    appNotes: { color: Colors.text.secondary, fontSize: FontSize.xs, marginBottom: 8, fontStyle: 'italic' },
    appActions: { flexDirection: 'row', gap: 8 },
    appActionBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radii.md, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
    appActionDanger: { flex: 0, paddingHorizontal: 14, borderColor: Colors.error + '40' },
    appActionText: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },
    appActionDangerText: { color: Colors.error, fontSize: FontSize.sm },
    statusSummary: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radii.md },
    statusSummaryCount: { fontSize: FontSize.md, fontWeight: '700' },
    statusSummaryLabel: { color: Colors.text.secondary, fontSize: FontSize.xs },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700', marginBottom: 6 },
    emptyText: { color: Colors.text.secondary, fontSize: FontSize.sm, textAlign: 'center' },

    profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.accent + '33', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: Colors.accent, fontSize: 22, fontWeight: '800' },
    profileName: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
    profileRole: { color: Colors.accent, fontSize: FontSize.sm, marginTop: 1 },
    profileLocationText: { color: Colors.text.secondary, fontSize: FontSize.xs, marginTop: 2 },
    editBtn: { backgroundColor: Colors.accentSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radii.md },
    editBtnText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '600' },
    completionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    completionLabel: { color: Colors.text.secondary, fontSize: FontSize.xs, width: 130 },
    completionBar: { flex: 1, height: 6, backgroundColor: Colors.surface, borderRadius: 3, overflow: 'hidden' },
    completionFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 3 },
    completionHint: { color: Colors.text.muted, fontSize: FontSize.xs, marginTop: 6, fontStyle: 'italic' },
    sectionTitle: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    profileRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    profileRowIcon: { fontSize: 14, marginRight: 8, width: 20 },
    profileRowLabel: { color: Colors.text.secondary, fontSize: FontSize.xs, width: 90 },
    profileRowValue: { color: Colors.text.primary, fontSize: FontSize.xs, flex: 1 },
    profileRowMuted: { color: Colors.text.muted, fontStyle: 'italic' },
    skillsBlock: { color: Colors.text.primary, fontSize: FontSize.xs, lineHeight: 20 },
    summaryText: { color: Colors.text.secondary, fontSize: FontSize.xs, lineHeight: 20 },

    locationOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    locationOptionActive: { backgroundColor: Colors.accentSoft, borderRadius: Radii.md, paddingHorizontal: 8, borderBottomColor: 'transparent' },
    locationOptionIcon: { fontSize: 16, marginRight: 10 },
    locationOptionText: { color: Colors.text.primary, fontSize: FontSize.sm, flex: 1 },
    locationCheck: { color: Colors.accent, fontSize: 16, fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, maxHeight: '92%' },
    modalHandle: { width: 40, height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    modalTitle: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700', flex: 1 },
    modalSub: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 2 },
    closeBtn: { padding: 4 },
    closeBtnText: { color: Colors.text.secondary, fontSize: 18 },

    matchBanner: { padding: 10, borderRadius: Radii.md, marginBottom: 10, alignItems: 'center' },
    matchBannerText: { fontSize: FontSize.sm, fontWeight: '700' },
    warningBanner: { backgroundColor: '#F59E0B18', padding: 8, borderRadius: Radii.md, marginBottom: 10 },
    warningText: { color: '#F59E0B', fontSize: FontSize.xs },

    autoFillHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    sectionLabel: { color: Colors.text.muted, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    copyBtn: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '600' },
    autoFillRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.divider, gap: 12 },
    autoFillLabel: { color: Colors.text.muted, fontSize: FontSize.xs, width: 110 },
    autoFillValue: { color: Colors.text.primary, fontSize: FontSize.xs, flex: 1 },
    coverLetterBox: { backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: 12 },
    coverLetterText: { color: Colors.text.secondary, fontSize: FontSize.xs, lineHeight: 20 },
    applyNote: { color: Colors.text.muted, fontSize: FontSize.xs, lineHeight: 18, marginVertical: 12, fontStyle: 'italic' },
    modalBtnRow: { flexDirection: 'row', gap: 10 },

    profileNote: { backgroundColor: Colors.accentSoft, padding: 10, borderRadius: Radii.md, marginBottom: 14 },
    profileNoteText: { color: Colors.accent, fontSize: FontSize.xs },
    fieldGroup: { marginBottom: 12 },
    fieldLabel: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600', marginBottom: 5 },
    fieldInput: { backgroundColor: Colors.input, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: Radii.md, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text.primary, fontSize: FontSize.sm },
    fieldInputMulti: { minHeight: 80, textAlignVertical: 'top' },
    fieldHint: { color: Colors.text.muted, fontSize: FontSize.xs, marginTop: 4, fontStyle: 'italic' },

    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 4 },
    statusOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.card, flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusOptionText: { fontSize: FontSize.xs, fontWeight: '600' },

    primaryBtn: { backgroundColor: '#3B82F6', borderRadius: Radii.md, paddingVertical: 12, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
});
