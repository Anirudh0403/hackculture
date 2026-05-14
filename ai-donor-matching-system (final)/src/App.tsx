import { useState, useEffect, useCallback } from 'react';
import {
  Heart, Droplet, Users, MapPin, Bell, CheckCircle,
  AlertCircle, Calendar, Phone, Award, ArrowRight, MessageSquare,
  Plus, RefreshCw, Lock, Mail, User, LogOut, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ───────────────────── TYPES ───────────────────── */
interface Request {
  id: string;
  patientName: string;
  bloodType: string;
  units: number;
  city: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'pending' | 'matched' | 'fulfilled' | 'cancelled';
  date: string;
  matchedDonor?: string;
  notes?: string;
}

interface Donor {
  id: string;
  name: string;
  bloodType: string;
  city: string;
  phone: string;
  availability: string;
  lastDonated: string;
  isActive: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  time: string;
  read: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  role: 'patient' | 'donor' | 'coordinator';
  city: string;
}

interface StoredAccount {
  name: string;
  email: string;
  passwordHash: string;
  role: 'patient' | 'donor' | 'coordinator';
  city: string;
}

/* ───────────────────── CONSTANTS ───────────────────── */
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CITIES = ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad'];

const COMPATIBILITY: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

const initialInventory: Record<string, Record<string, number>> = {
  'Delhi': { 'A+': 45, 'A-': 12, 'B+': 38, 'B-': 15, 'AB+': 22, 'AB-': 8, 'O+': 52, 'O-': 19 },
  'Mumbai': { 'A+': 62, 'A-': 18, 'B+': 29, 'B-': 11, 'AB+': 14, 'AB-': 7, 'O+': 41, 'O-': 23 },
  'Bengaluru': { 'A+': 33, 'A-': 14, 'B+': 47, 'B-': 9, 'AB+': 19, 'AB-': 6, 'O+': 35, 'O-': 17 },
  'Hyderabad': { 'A+': 51, 'A-': 21, 'B+': 26, 'B-': 13, 'AB+': 17, 'AB-': 10, 'O+': 48, 'O-': 14 },
  'Chennai': { 'A+': 27, 'A-': 9, 'B+': 34, 'B-': 16, 'AB+': 12, 'AB-': 5, 'O+': 29, 'O-': 22 },
  'Kolkata': { 'A+': 39, 'A-': 17, 'B+': 24, 'B-': 8, 'AB+': 21, 'AB-': 9, 'O+': 37, 'O-': 11 },
  'Ahmedabad': { 'A+': 44, 'A-': 13, 'B+': 31, 'B-': 12, 'AB+': 15, 'AB-': 6, 'O+': 43, 'O-': 18 },
};

/* ───────────────────── APP ───────────────────── */
export default function BloodWarriors() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    name: 'Saanvi Kapoor',
    email: 'saanvi@example.com',
    role: 'patient',
    city: 'Delhi'
  });
  
  // Login form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginRole, setLoginRole] = useState<'patient' | 'donor' | 'coordinator'>('patient');
  const [loginCity, setLoginCity] = useState('Delhi');
  const [loginError, setLoginError] = useState('');

  // Registered Accounts State
  const [accounts, setAccounts] = useState<StoredAccount[]>(() => {
    const savedAccounts = localStorage.getItem('bw_accounts');
    if (savedAccounts) {
      try {
        return JSON.parse(savedAccounts);
      } catch (e) {
        console.error(e);
      }
    }
    // Default seeded accounts
    const initialAccounts: StoredAccount[] = [
      { name: 'Saanvi Kapoor', email: 'saanvi@patient.com', passwordHash: 'pass', role: 'patient', city: 'Delhi' },
      { name: 'Vikram Rao', email: 'vikram@donor.org', passwordHash: 'pass', role: 'donor', city: 'Mumbai' },
      { name: 'Dr. Amit Mehta', email: 'mehta@bloodbridge.in', passwordHash: 'pass', role: 'coordinator', city: 'Delhi' },
      { name: 'Test User', email: 'test@example.com', passwordHash: 'pass', role: 'patient', city: 'Delhi' }
    ];
    localStorage.setItem('bw_accounts', JSON.stringify(initialAccounts));
    return initialAccounts;
  });

  // App portal views state
  const [currentRole, setCurrentRole] = useState<'patient' | 'donor' | 'coordinator'>('patient');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inventory, setInventory] = useState<Record<string, Record<string, number>>>(initialInventory);
  const [requests, setRequests] = useState<Request[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  
  // AI state
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'assistant', content: "Namaste! I'm your AI Blood Bridge assistant. How can I help you find the right match today?" }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Forms pre-fills
  const [newRequest, setNewRequest] = useState({
    patientName: 'Rahul Sharma',
    bloodType: 'B+',
    units: 2,
    city: 'Delhi',
    urgency: 'medium' as 'low' | 'medium' | 'high',
    notes: 'Thalassemia patient, regular transfusion needed'
  });

  const [newDonor, setNewDonor] = useState({
    name: 'Priya Patel',
    bloodType: 'O+',
    city: 'Mumbai',
    phone: '+91 98765 43210',
    availability: 'Weekends & Evenings'
  });

  /* ─── Check Auth and Load Data on Mount ─── */
  useEffect(() => {
    // Check if user session exists
    const storedAuth = localStorage.getItem('bw_auth');
    const storedUser = localStorage.getItem('bw_user');
    
    if (storedAuth === 'true' && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setCurrentUser(parsedUser);
        setCurrentRole(parsedUser.role);
        // default route mapping
        if (parsedUser.role === 'patient') setActiveTab('dashboard');
        else if (parsedUser.role === 'donor') setActiveTab('donors');
        else setActiveTab('requests');
      } catch (e) {
        console.error(e);
      }
    }

    // Load saved database state
    const savedRequests = localStorage.getItem('bw_requests');
    const savedDonors = localStorage.getItem('bw_donors');
    const savedInventory = localStorage.getItem('bw_inventory');
    const savedNotifications = localStorage.getItem('bw_notifications');

    if (savedRequests) setRequests(JSON.parse(savedRequests));
    else {
      const demoRequests: Request[] = [
        { id: 'req-1', patientName: 'Aarav Khan', bloodType: 'O-', units: 3, city: 'Mumbai', urgency: 'high', status: 'matched', date: '2025-01-12', matchedDonor: 'Vikram Rao', notes: 'Urgent for 14yr old' },
        { id: 'req-2', patientName: 'Meera Iyer', bloodType: 'A+', units: 1, city: 'Bengaluru', urgency: 'medium', status: 'pending', date: '2025-01-14', notes: 'Thalassemia major' }
      ];
      setRequests(demoRequests);
      localStorage.setItem('bw_requests', JSON.stringify(demoRequests));
    }

    if (savedDonors) setDonors(JSON.parse(savedDonors));
    else {
      const demoDonors: Donor[] = [
        { id: 'd1', name: 'Vikram Rao', bloodType: 'O-', city: 'Mumbai', phone: '+91 98213 44567', availability: 'Anytime', lastDonated: '12 days ago', isActive: true },
        { id: 'd2', name: 'Anika Desai', bloodType: 'B+', city: 'Delhi', phone: '+91 70114 55678', availability: 'Weekdays after 4pm', lastDonated: '3 days ago', isActive: true },
        { id: 'd3', name: 'Rohan Kapoor', bloodType: 'A+', city: 'Bengaluru', phone: '+91 94482 11903', availability: 'Weekends', lastDonated: '1 month ago', isActive: true },
      ];
      setDonors(demoDonors);
      localStorage.setItem('bw_donors', JSON.stringify(demoDonors));
    }

    if (savedInventory) setInventory(JSON.parse(savedInventory));
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
    else {
      const demoNotifs: Notification[] = [
        { id: 'n1', title: 'Match Found!', message: 'Compatible donor found for your O- request in Mumbai', type: 'success', time: '2m ago', read: false },
        { id: 'n2', title: 'New Request', message: 'Urgent A+ needed in Bengaluru', type: 'info', time: '41m ago', read: true },
      ];
      setNotifications(demoNotifs);
      localStorage.setItem('bw_notifications', JSON.stringify(demoNotifs));
    }
  }, []);

  /* ─── Persist to localStorage whenever data changes ─── */
  useEffect(() => { localStorage.setItem('bw_requests', JSON.stringify(requests)); }, [requests]);
  useEffect(() => { localStorage.setItem('bw_donors', JSON.stringify(donors)); }, [donors]);
  useEffect(() => { localStorage.setItem('bw_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('bw_notifications', JSON.stringify(notifications)); }, [notifications]);

  /* ─── Computed stats (always live) ─── */
  const totalDonors = donors.length + 12480;
  const totalHelped = requests.filter(r => r.status === 'fulfilled').length + 874;
  const unitsThisMonth = 1243;

  const getTotalInventory = useCallback(() => {
    return Object.values(inventory).reduce((sum, cityInv) =>
      sum + Object.values(cityInv).reduce((s, v) => s + v, 0), 0
    );
  }, [inventory]);

  /* ─── Helpers ─── */
  const addNotification = useCallback((title: string, message: string, type: 'success' | 'info' | 'warning') => {
    setNotifications(prev => [{
      id: 'notif-' + Date.now(),
      title, message, type, time: 'Just now', read: false
    }, ...prev].slice(0, 12));
  }, []);

  const checkAvailability = useCallback((city: string, bloodType: string, units: number) => {
    if (!inventory[city] || !inventory[city][bloodType]) return { available: false, unitsAvailable: 0 };
    return { available: inventory[city][bloodType] >= units, unitsAvailable: inventory[city][bloodType] };
  }, [inventory]);

  const simulateAIMatch = useCallback((req: Request): { matched: boolean; donor?: Donor; message: string } => {
    const compatibleDonors = donors.filter(d =>
      COMPATIBILITY[req.bloodType]?.includes(d.bloodType) &&
      (d.city === req.city || Math.random() > 0.6) &&
      d.isActive
    );
    if (compatibleDonors.length > 0) {
      const bestMatch = compatibleDonors[Math.floor(Math.random() * compatibleDonors.length)];
      return { matched: true, donor: bestMatch, message: `AI found ${bestMatch.name} (${bestMatch.bloodType}) in ${bestMatch.city}. Ready to connect.` };
    }
    return { matched: false, message: "No immediate match found. Request has been broadcast to our network. We'll notify you as soon as a donor is available." };
  }, [donors]);

  /* ─── Submit Blood Request ─── */
  const submitBloodRequest = useCallback(() => {
    const avail = checkAvailability(newRequest.city, newRequest.bloodType, newRequest.units);
    const request: Request = {
      id: 'req-' + Date.now(),
      patientName: newRequest.patientName,
      bloodType: newRequest.bloodType,
      units: newRequest.units,
      city: newRequest.city,
      urgency: newRequest.urgency,
      status: avail.available ? 'matched' : 'pending',
      date: new Date().toISOString().split('T')[0],
      notes: newRequest.notes
    };

    if (avail.available) {
      // Reduce inventory
      setInventory(prev => {
        const updated = { ...prev };
        if (updated[newRequest.city] && updated[newRequest.city][newRequest.bloodType] !== undefined) {
          updated[newRequest.city] = { ...updated[newRequest.city] };
          updated[newRequest.city][newRequest.bloodType] = Math.max(0, updated[newRequest.city][newRequest.bloodType] - newRequest.units);
        }
        return updated;
      });

      const aiResult = simulateAIMatch(request);
      if (aiResult.matched && aiResult.donor) {
        request.matchedDonor = aiResult.donor.name;
      }

      addNotification('Blood Available!', `${newRequest.units} units of ${newRequest.bloodType} located in ${newRequest.city}. Matched successfully.`, 'success');
      setSelectedRequest(request);
      setShowMatchModal(true);
    } else {
      addNotification('Request Received', `Your request for ${newRequest.units} units of ${newRequest.bloodType} in ${newRequest.city} has been added to the network.`, 'info');
    }

    setRequests(prev => [request, ...prev]);
    setShowRequestModal(false);
    setNewRequest(p => ({ ...p, units: 2, notes: '' }));
  }, [newRequest, checkAvailability, simulateAIMatch, addNotification]);

  /* ─── Volunteer to Donate ─── */
  const volunteerToDonate = useCallback((requestId: string, donorName: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id === requestId) return { ...r, status: 'fulfilled' as const, matchedDonor: donorName };
      return r;
    }));
    addNotification('Thank You!', `You have been matched to help ${requests.find(r => r.id === requestId)?.patientName || 'a patient'}. A coordinator will contact you shortly.`, 'success');
  }, [requests, addNotification]);

  /* ─── Fulfill Request (coordinator) ─── */
  const fulfillRequest = useCallback((requestId: string) => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'fulfilled' as const } : r));
    addNotification('Request Fulfilled', 'Blood donation successfully coordinated.', 'success');
  }, [addNotification]);

  /* ─── Add New Donor ─── */
  const addNewDonor = useCallback(() => {
    const donor: Donor = {
      id: 'donor-' + Date.now(),
      name: newDonor.name,
      bloodType: newDonor.bloodType,
      city: newDonor.city,
      phone: newDonor.phone,
      availability: newDonor.availability,
      lastDonated: 'Just now',
      isActive: true
    };
    setDonors(prev => [donor, ...prev]);
    // Also add to inventory
    setInventory(prev => {
      const updated = { ...prev };
      if (updated[newDonor.city]) {
        updated[newDonor.city] = { ...updated[newDonor.city] };
        updated[newDonor.city][newDonor.bloodType] = (updated[newDonor.city][newDonor.bloodType] || 0) + 1;
      }
      return updated;
    });
    addNotification('New Donor Added', `${newDonor.name} (${newDonor.bloodType}) joined the network from ${newDonor.city}`, 'success');
    setShowDonorModal(false);
    setNewDonor({ name: '', bloodType: 'O+', city: 'Delhi', phone: '', availability: '' });
  }, [newDonor, addNotification]);

  /* ─── AI Chat ─── */
  const sendAIMessage = useCallback(() => {
    if (!aiInput.trim()) return;
    setAiMessages(prev => [...prev, { role: 'user', content: aiInput }]);
    const userQuery = aiInput.toLowerCase();
    setAiInput('');
    setIsProcessing(true);

    setTimeout(() => {
      let response = "I'm analyzing our donor network...";
      if (userQuery.includes('match') || userQuery.includes('find')) {
        response = "Based on real-time data, we have 17 compatible O+ donors active within 80km of Delhi. Would you like me to connect you with the top 3?";
      } else if (userQuery.includes('available') || userQuery.includes('stock')) {
        response = `Current stock: Mumbai O+ (${inventory['Mumbai']?.['O+'] || 0} units), Delhi A- (${inventory['Delhi']?.['A-'] || 0} units). Delhi has low A- — I recommend prioritizing Delhi for urgent cases.`;
      } else if (userQuery.includes('thalassemia')) {
        response = "For Thalassemia patients, we prioritize phenotype matched blood. Our AI system cross-references 2400+ registered donors every 4 hours to find recurring matches.";
      } else if (userQuery.includes('hi') || userQuery.includes('hello') || userQuery.includes('namaste')) {
        response = "Namaste! I can help you register donors, check availability across 7 cities, or coordinate an urgent request. What do you need?";
      } else {
        response = "Your request has been logged. Our AI matching engine is searching " + donors.length + " donors right now. Expect an update within the next 20 minutes.";
      }
      setAiMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsProcessing(false);
    }, 1100);
  }, [aiInput, inventory, donors]);

  /* ─── Authentication Actions ─── */
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    if (loginPassword.length < 4) {
      setLoginError('Password must be at least 4 characters long.');
      return;
    }

    let userObj: UserProfile;

    if (authMode === 'login') {
      // Verify details against stored accounts
      const matchedAccount = accounts.find(
        acc => acc.email.toLowerCase() === trimmedEmail.toLowerCase() && acc.passwordHash === loginPassword
      );

      if (!matchedAccount) {
        setLoginError('Verification failed: Credentials not matched. Please verify details or click "Create Account".');
        return;
      }

      userObj = {
        name: matchedAccount.name,
        email: matchedAccount.email,
        role: matchedAccount.role,
        city: matchedAccount.city
      };
    } else {
      // Register mode
      if (!loginName.trim()) {
        setLoginError('Please enter your full name.');
        return;
      }

      // Check if email already registered
      const existing = accounts.find(acc => acc.email.toLowerCase() === trimmedEmail.toLowerCase());
      if (existing) {
        setLoginError('An account with this email already exists. Please switch to "Sign In".');
        return;
      }

      const newAccount: StoredAccount = {
        name: loginName.trim(),
        email: trimmedEmail,
        passwordHash: loginPassword,
        role: loginRole,
        city: loginCity
      };

      // Add to accounts array
      setAccounts(prev => {
        const updated = [...prev, newAccount];
        localStorage.setItem('bw_accounts', JSON.stringify(updated));
        return updated;
      });

      userObj = {
        name: newAccount.name,
        email: newAccount.email,
        role: newAccount.role,
        city: newAccount.city
      };
    }

    // Update user profile
    setCurrentUser(userObj);
    setCurrentRole(userObj.role);
    setIsAuthenticated(true);
    
    // Auto-direct to specific dashboard view based on chosen role
    if (userObj.role === 'patient') setActiveTab('dashboard');
    else if (userObj.role === 'donor') setActiveTab('donors');
    else setActiveTab('requests');

    // Save auth session
    localStorage.setItem('bw_auth', 'true');
    localStorage.setItem('bw_user', JSON.stringify(userObj));
    
    // Add welcome notification
    addNotification(
      'Successfully Logged In', 
      `Welcome to Blood Warriors, ${userObj.name}. You are logged in as a ${userObj.role.toUpperCase()}.`, 
      'success'
    );
  };

  const handleQuickLogin = (role: 'patient' | 'donor' | 'coordinator', sampleName: string, sampleEmail: string) => {
    const userObj: UserProfile = {
      name: sampleName,
      email: sampleEmail,
      role: role,
      city: 'Delhi'
    };

    setCurrentUser(userObj);
    setCurrentRole(role);
    setIsAuthenticated(true);

    if (role === 'patient') setActiveTab('dashboard');
    else if (role === 'donor') setActiveTab('donors');
    else setActiveTab('requests');

    localStorage.setItem('bw_auth', 'true');
    localStorage.setItem('bw_user', JSON.stringify(userObj));
    
    addNotification(
      'Demo Role Switch', 
      `Instant preview enabled as ${sampleName} (${role.toUpperCase()}).`, 
      'info'
    );
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('bw_auth');
    localStorage.removeItem('bw_user');
  };

  /* ─── Role Change inside app → go to correct tab ─── */
  const handleRoleChange = useCallback((role: 'patient' | 'donor' | 'coordinator') => {
    setCurrentRole(role);
    setCurrentUser(prev => {
      const nextUser = { ...prev, role };
      localStorage.setItem('bw_user', JSON.stringify(nextUser));
      return nextUser;
    });

    if (role === 'patient') setActiveTab('dashboard');
    else if (role === 'donor') setActiveTab('donors');
    else setActiveTab('requests');
  }, []);

  /* ─── Color helpers ─── */
  const getUrgencyColor = (u: string) => u === 'high' ? 'bg-red-500 text-white' : u === 'medium' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white';
  const getStatusColor = (s: string) => s === 'fulfilled' ? 'text-emerald-600 bg-emerald-100' : s === 'matched' ? 'text-amber-600 bg-amber-100' : s === 'pending' ? 'text-blue-600 bg-blue-100' : 'text-slate-500 bg-slate-100';

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  /* ═══════════════════════════════════════════════════
     AUTHENTICATION / LOGIN SCREEN VIEW
     ═══════════════════════════════════════════════════ */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-900">
        
        {/* Foundation Branding */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-red-600 shadow-xl shadow-red-200 mb-4 animate-bounce">
            <Droplet className="h-9 w-9 text-white" />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Blood Warriors
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium tracking-wide">
            AI-Optimized Thalassemia Blood Bridge • Voluntary Network
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl sm:px-10 border border-slate-200"
          >
            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 rounded-2xl p-1 mb-6 text-sm font-bold">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setLoginError(''); }}
                className={`flex-1 py-2.5 rounded-xl transition-all ${authMode === 'login' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setLoginError(''); }}
                className={`flex-1 py-2.5 rounded-xl transition-all ${authMode === 'register' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Create Account
              </button>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-r-xl font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
                {loginError.includes('Create Account') && (
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setLoginError(''); }}
                    className="mt-1 sm:mt-0 text-[10px] bg-red-600 text-white font-black px-2.5 py-1 rounded-lg shrink-0 hover:bg-red-700 transition-colors uppercase tracking-wider"
                  >
                    Create Account →
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-red-500 focus:bg-white transition-colors"
                      placeholder="e.g. Rahul Verma"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-red-500 focus:bg-white transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-red-500 focus:bg-white transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                {authMode === 'login' ? (
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    Demo pre-seeded password: <span className="font-mono font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded">pass</span> for standard test accounts.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Create a memorable secure password (min 4 chars).</p>
                )}
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    I am registering as a:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['patient', 'donor', 'coordinator'] as const).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setLoginRole(r)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all capitalize ${
                          loginRole === r 
                            ? 'bg-red-50 border-red-500 text-red-600 ring-1 ring-red-500' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {r === 'patient' ? '🩺 Patient' : r === 'donor' ? '🩸 Donor' : '📋 Coord.'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Primary City
                  </label>
                  <select
                    value={loginCity}
                    onChange={(e) => setLoginCity(e.target.value)}
                    className="block w-full px-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-red-500 transition-colors"
                  >
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-red-200 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.99] transition-all"
                >
                  {authMode === 'login' ? 'Secure Sign In' : 'Join Network & Start Matching'}
                </button>
              </div>
            </form>

            {/* Quick Login / Demo Access Section */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
                  <span className="bg-white px-2 text-slate-400">
                    Or Instant Demo Logins
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('patient', 'Saanvi Kapoor', 'saanvi@patient.com')}
                  className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-red-50/60 rounded-xl border border-slate-200 text-xs text-left group transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🩺</span>
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-red-600 transition-colors">Patient Portal Demo</div>
                      <div className="text-[10px] text-slate-500">Need immediate cross-matched transfusions</div>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('donor', 'Vikram Rao', 'vikram@donor.org')}
                  className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-red-50/60 rounded-xl border border-slate-200 text-xs text-left group transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🩸</span>
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-red-600 transition-colors">Donor Portal Demo</div>
                      <div className="text-[10px] text-slate-500">Volunteer list, scheduling & eligibility alerts</div>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('coordinator', 'Dr. Amit Mehta', 'mehta@bloodbridge.in')}
                  className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-red-50/60 rounded-xl border border-slate-200 text-xs text-left group transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-red-600 transition-colors">Foundation Coordinator</div>
                      <div className="text-[10px] text-slate-500">Manage all blood requests & trigger AI overrides</div>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>

            <div className="mt-6 bg-slate-50 p-3 rounded-2xl flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Complies with Indian Thalassemia Voluntary Donor Network protocols.</span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     AUTHENTICATED APP DASHBOARD VIEW
     ═══════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 text-slate-900">

      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-200">
              <Droplet className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-2xl tracking-tight text-slate-900">BLOOD WARRIORS</div>
              <div className="text-[10px] text-red-600 font-bold tracking-wider -mt-0.5">THALASSAEMIA BLOOD BRIDGE</div>
            </div>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center gap-x-6 overflow-x-auto">
            <div className="flex bg-slate-100 rounded-3xl p-1.5 text-sm font-bold">
              <button
                onClick={() => handleRoleChange('patient')}
                className={`px-5 py-2 rounded-3xl transition-all duration-300 ${currentRole === 'patient' ? 'bg-red-600 text-white shadow-md shadow-red-200' : 'text-slate-500 hover:text-slate-900 hover:bg-white'}`}
              >
                🩺 Patient
              </button>
              <button
                onClick={() => handleRoleChange('donor')}
                className={`px-5 py-2 rounded-3xl transition-all duration-300 ${currentRole === 'donor' ? 'bg-red-600 text-white shadow-md shadow-red-200' : 'text-slate-500 hover:text-slate-900 hover:bg-white'}`}
              >
                🩸 Donor
              </button>
              <button
                onClick={() => handleRoleChange('coordinator')}
                className={`px-5 py-2 rounded-3xl transition-all duration-300 ${currentRole === 'coordinator' ? 'bg-red-600 text-white shadow-md shadow-red-200' : 'text-slate-500 hover:text-slate-900 hover:bg-white'}`}
              >
                📋 Coordinator
              </button>
            </div>

            {/* Nav Tabs */}
            <div className="hidden md:flex items-center gap-x-6 text-sm font-bold">
              <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-x-2 transition-colors ${activeTab === 'dashboard' ? 'text-red-600' : 'text-slate-400 hover:text-slate-900'}`}>
                <Heart className="h-4 w-4" /> Dashboard
              </button>
              <button onClick={() => setActiveTab('requests')} className={`flex items-center gap-x-2 transition-colors ${activeTab === 'requests' ? 'text-red-600' : 'text-slate-400 hover:text-slate-900'}`}>
                Requests
              </button>
              <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-x-2 transition-colors ${activeTab === 'inventory' ? 'text-red-600' : 'text-slate-400 hover:text-slate-900'}`}>
                Inventory
              </button>
              {currentRole !== 'patient' && (
                <button onClick={() => setActiveTab('donors')} className={`flex items-center gap-x-2 transition-colors ${activeTab === 'donors' ? 'text-red-600' : 'text-slate-400 hover:text-slate-900'}`}>
                  Donors
                </button>
              )}
              <button onClick={() => setActiveTab('ai')} className={`flex items-center gap-x-2 transition-colors ${activeTab === 'ai' ? 'text-red-600' : 'text-slate-400 hover:text-slate-900'}`}>
                <MessageSquare className="h-4 w-4 text-red-500" /> AI Match
              </button>
            </div>

            <div className="flex items-center gap-x-3 shrink-0">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2.5 hover:bg-slate-100 rounded-2xl transition-all">
                <Bell className="h-5 w-5 text-slate-600" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <div className="absolute top-1 right-1 h-4 w-4 bg-red-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                    {notifications.filter(n => !n.read).length}
                  </div>
                )}
              </button>

              <div className="flex items-center gap-x-3 bg-slate-50 pl-3 pr-4 py-1.5 rounded-2xl border border-slate-200">
                <div className="h-8 w-8 bg-red-100 text-red-700 rounded-xl flex items-center justify-center text-xs font-black">
                  {getInitials(currentUser.name)}
                </div>
                <div className="text-xs hidden sm:block">
                  <div className="font-bold text-slate-800 truncate max-w-[100px]">{currentUser.name}</div>
                  <div className="text-[10px] text-emerald-600 font-bold capitalize">{currentRole}</div>
                </div>
                <button 
                  onClick={handleLogout} 
                  title="Sign Out" 
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-200/50 rounded-lg transition-colors ml-1"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile view subnav */}
      <div className="flex md:hidden items-center justify-around bg-white border-b border-slate-200 px-4 py-2.5 text-xs font-bold overflow-x-auto gap-2">
        <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1.5 rounded-xl ${activeTab === 'dashboard' ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}>Dashboard</button>
        <button onClick={() => setActiveTab('requests')} className={`px-3 py-1.5 rounded-xl ${activeTab === 'requests' ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}>Requests</button>
        <button onClick={() => setActiveTab('inventory')} className={`px-3 py-1.5 rounded-xl ${activeTab === 'inventory' ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}>Inventory</button>
        {currentRole !== 'patient' && (
          <button onClick={() => setActiveTab('donors')} className={`px-3 py-1.5 rounded-xl ${activeTab === 'donors' ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}>Donors</button>
        )}
        <button onClick={() => setActiveTab('ai')} className={`px-3 py-1.5 rounded-xl flex items-center gap-1 ${activeTab === 'ai' ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}>
          <MessageSquare className="h-3 w-3 text-red-500" /> AI
        </button>
      </div>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="flex max-w-7xl mx-auto">

        {/* SIDEBAR */}
        <div className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] p-6 hidden lg:flex flex-col shadow-sm">
          <div className="uppercase text-xs tracking-[2px] text-slate-400 mb-6 font-bold px-3">India Network</div>

          <div className="space-y-1 mb-10">
            {CITIES.map(city => (
              <div key={city} className="px-4 py-3 text-sm flex items-center gap-2.5 hover:bg-red-50 rounded-2xl cursor-pointer transition-colors text-slate-600 font-semibold hover:text-red-700">
                <MapPin className="h-4 w-4 text-red-500" />
                {city}
                <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                  {Object.values(inventory[city] || {}).reduce((a, b) => a + b, 0)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-8 border-t border-slate-200 space-y-4">
            <div className="px-4 py-5 bg-gradient-to-br from-red-50 to-rose-100 rounded-3xl border border-red-100">
              <div className="flex items-center gap-x-3 mb-4">
                <div className="text-red-600"><Award className="h-5 w-5" /></div>
                <div className="text-sm font-bold text-slate-900">Impact this month</div>
              </div>
              <div className="text-5xl font-black text-slate-900 tracking-tighter mb-1">{unitsThisMonth}</div>
              <div className="text-xs text-slate-500 font-bold">UNITS MATCHED</div>
            </div>

            <button onClick={() => setAiChatOpen(true)} className="w-full flex items-center justify-center gap-x-2 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-2xl font-bold text-sm active:scale-[0.985] transition-all shadow-lg shadow-red-200">
              <MessageSquare className="h-4 w-4" />
              Talk to AI Coordinator
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-6 sm:p-8 lg:p-10 overflow-auto" style={{ maxHeight: 'calc(100vh - 73px)' }}>
          <AnimatePresence mode="wait">

            {/* ─── DASHBOARD ─── */}
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
                    <div>
                      <div className="uppercase text-red-600 text-xs tracking-[3px] font-bold">Welcome back, {currentUser.name}</div>
                      <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900 mt-1">Blood Bridge <span className="text-red-600">Live</span></h1>
                    </div>
                    <div className="sm:text-right">
                      <div className="text-xs text-slate-400 font-bold">NETWORK STATUS</div>
                      <div className="flex items-center gap-x-2 justify-start sm:justify-end mt-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100">
                        <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></div>
                        <span className="text-xs font-bold">{totalDonors.toLocaleString()} DONORS ONLINE</span>
                      </div>
                    </div>
                  </div>

                  {/* STATS — live */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <motion.div whileHover={{ scale: 1.015 }} className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm">
                      <div className="flex justify-between">
                        <div>
                          <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider">REGISTERED DONORS</div>
                          <div className="text-4xl sm:text-[46px] font-black tracking-tight text-slate-900 mt-2">{totalDonors.toLocaleString()}</div>
                        </div>
                        <Users className="h-10 w-10 text-emerald-500 bg-emerald-50 rounded-2xl p-2 shrink-0" />
                      </div>
                      <div className="text-xs text-emerald-600 mt-5 font-bold flex items-center gap-1">
                        <span className="inline-block w-2 h-2 bg-current rounded-full"></span> +184 donors joined this week
                      </div>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.015 }} className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm">
                      <div className="flex justify-between">
                        <div>
                          <div className="text-amber-600 text-xs font-bold uppercase tracking-wider">PATIENTS SUPPORTED</div>
                          <div className="text-4xl sm:text-[46px] font-black tracking-tight text-slate-900 mt-2">{totalHelped}</div>
                        </div>
                        <Heart className="h-10 w-10 text-amber-500 bg-amber-50 rounded-2xl p-2 shrink-0" />
                      </div>
                      <div className="text-xs text-amber-600 mt-5 font-bold">LIFETIME • 1.2 lakh transfusions</div>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.015 }} className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm col-span-1 md:col-span-2 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="uppercase tracking-widest text-xs text-red-600 font-bold">LIVE INVENTORY UNITS</div>
                          <div className="text-4xl font-black text-slate-900 mt-2">{getTotalInventory()} <span className="text-slate-400 text-xl font-bold">AVAILABLE</span></div>
                          <div className="text-slate-500 text-xs mt-1 font-medium">Cross-referenced across {CITIES.length} Indian cities</div>
                        </div>
                        <div className="text-right text-xs leading-snug font-mono bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                          O- : <span className="text-emerald-600 font-black">{Object.values(inventory).reduce((s, c) => s + (c['O-'] || 0), 0)}</span><br />
                          A+ : <span className="text-red-600 font-black">{Object.values(inventory).reduce((s, c) => s + (c['A+'] || 0), 0)}</span>
                        </div>
                      </div>
                      <button onClick={() => setActiveTab('inventory')} className="self-start mt-6 flex items-center gap-x-2 text-xs uppercase tracking-wider border border-slate-300 hover:border-red-500 hover:text-red-600 hover:bg-red-50/50 px-5 py-2.5 rounded-xl transition-all font-bold">
                        VIEW CITY-WISE DISTRIBUTION <ArrowRight className="h-3 w-3" />
                      </button>
                    </motion.div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  {/* RECENT ACTIVITY */}
                  <div className="col-span-12 lg:col-span-7 bg-white rounded-3xl p-7 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="font-black text-xl text-slate-900">Recent Request Stream</div>
                      <button onClick={() => setActiveTab('requests')} className="text-xs flex items-center gap-x-1 text-red-600 hover:text-red-700 font-bold">
                        VIEW ALL <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {requests.slice(0, 5).map((req, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-50 hover:bg-red-50/60 p-4 rounded-2xl transition-all group border border-slate-100">
                          <div className="flex items-center gap-x-4">
                            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-sm font-mono font-black border-2 ${req.bloodType.includes('-') ? 'border-red-500 text-red-600 bg-red-50' : 'border-slate-300 text-slate-700 bg-white'}`}>
                              {req.bloodType}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-red-600 transition-colors">{req.patientName}</div>
                              <div className="text-xs text-slate-500 font-medium">{req.city} • <span className="font-bold text-slate-700">{req.units} units</span> • {req.date}</div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 text-xs rounded-full font-black tracking-wide ${getStatusColor(req.status)}`}>
                            {req.status.toUpperCase()}
                          </div>
                        </div>
                      ))}

                      {requests.length === 0 && (
                        <div className="text-center py-12 text-slate-400 font-medium text-sm">
                          No pending blood bridge matching tasks. Click the button on the right to broadcast a requirement.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QUICK ACTIONS */}
                  <div className="col-span-12 lg:col-span-5 space-y-6">
                    <div
                      onClick={() => setShowRequestModal(true)}
                      className="bg-gradient-to-br from-red-600 via-red-600 to-rose-700 rounded-3xl p-8 cursor-pointer active:scale-[0.985] transition-transform group shadow-xl shadow-red-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="uppercase text-red-200 text-xs tracking-widest font-black">AI OVERRIDE BUTTON</div>
                          <div className="text-3xl font-black tracking-tight mt-2 leading-none text-white">Broadcast<br />Blood Need</div>
                        </div>
                        <div className="bg-white/10 rounded-2xl p-3 group-active:rotate-90 transition-transform">
                          <Plus className="h-7 w-7 text-white" />
                        </div>
                      </div>
                      <div className="mt-14 text-xs text-red-100 font-medium opacity-90 leading-relaxed">
                        Matches regional voluntary inventory in under 40 seconds. Real-time availability verification triggers automated donor push notifications.
                      </div>
                    </div>

                    {currentRole === 'donor' && (
                      <div
                        onClick={() => setShowDonorModal(true)}
                        className="bg-white border-2 border-dashed border-slate-300 hover:border-red-500 rounded-3xl p-7 cursor-pointer transition-all text-center"
                      >
                        <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                          <Droplet className="h-7 w-7" />
                        </div>
                        <div className="font-bold text-base text-slate-900">Enlist as Recurring Donor</div>
                        <div className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
                          Provide ongoing blood matching compatibility for local Thalassemia major warriors.
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-3xl p-6 text-sm border border-slate-200 shadow-sm">
                      <div className="font-bold mb-3 flex items-center gap-x-2 text-slate-900 text-xs uppercase tracking-wider">
                        <RefreshCw className="h-4 w-4 text-red-600" /> AI Ecosystem Intelligence
                      </div>
                      <div className="text-slate-600 leading-relaxed text-xs">
                        System monitors suggest <span className="font-bold text-slate-900">O- negative</span> availability has dropped below baseline thresholds in <span className="font-bold text-slate-900">Chennai</span>. High probability of transfusion deficits next 48 hours.
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('ai');
                          setAiMessages(prev => [...prev, {
                            role: 'assistant',
                            content: "I have identified 4 high-frequency donors with O- blood type registered in Chennai. Activating priority multi-channel SMS/WhatsApp reach out scripts now."
                          }]);
                        }}
                        className="mt-4 text-xs border border-slate-300 px-4 py-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-300 w-full font-bold transition-colors text-slate-700"
                      >
                        TRIGGER PROACTIVE AI RECRUITMENT
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── REQUESTS TAB ─── */}
            {activeTab === 'requests' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900">Blood Demand Registry</h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">All real-time transfusion broadcast cases • Instant inventory lookup status</p>
                  </div>
                  <button onClick={() => setShowRequestModal(true)} className="flex items-center gap-x-2 bg-red-600 hover:bg-red-700 transition-colors px-6 py-3 rounded-2xl text-xs font-black text-white shadow-lg shadow-red-200">
                    <Plus className="h-4 w-4" /> NEW REQUEST
                  </button>
                </div>

                <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
                  <div className="hidden md:flex px-8 py-4 border-b border-slate-200 items-center justify-between text-xs uppercase tracking-wider text-slate-400 font-black bg-slate-50">
                    <div className="flex-1">PATIENT / WARRIOR</div>
                    <div className="flex-1">GROUP & AMOUNT</div>
                    <div className="flex-1">GEOLOCATION</div>
                    <div className="w-28 text-center">CRITICALITY</div>
                    <div className="w-28 text-center">AI VERIFICATION</div>
                    <div className="w-28 text-center">INTERVENTION</div>
                  </div>

                  {requests.length > 0 ? requests.map(request => (
                    <div key={request.id} className="p-6 md:px-8 md:py-5 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-full md:flex-1">
                        <div className="font-bold text-slate-900 text-base">{request.patientName}</div>
                        {request.notes && <div className="text-xs text-slate-500 line-clamp-1 italic mt-0.5">"{request.notes}"</div>}
                      </div>
                      
                      <div className="w-full md:flex-1 flex items-center gap-x-3">
                        <span className="font-mono text-xl font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">{request.bloodType}</span>
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">× {request.units} Units</span>
                      </div>

                      <div className="w-full md:flex-1 flex items-center gap-x-2 text-xs font-bold text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <span>{request.city}</span>
                      </div>

                      <div className="w-full md:w-28 md:text-center flex items-center justify-between md:justify-center">
                        <span className="text-xs font-bold md:hidden text-slate-400">Urgency:</span>
                        <span className={`text-[10px] px-3 py-1 rounded-full font-black tracking-wider ${getUrgencyColor(request.urgency)}`}>
                          {request.urgency.toUpperCase()}
                        </span>
                      </div>

                      <div className="w-full md:w-28 md:text-center flex items-center justify-between md:justify-center">
                        <span className="text-xs font-bold md:hidden text-slate-400">Status:</span>
                        <span className={`px-3 py-1 text-xs rounded-full font-black ${getStatusColor(request.status)}`}>
                          {request.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="w-full md:w-28 md:text-center pt-2 md:pt-0 border-t border-slate-100 md:border-none flex justify-end">
                        {currentRole === 'donor' && request.status === 'pending' && (
                          <button onClick={() => volunteerToDonate(request.id, currentUser.name)} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 transition-colors text-xs font-bold px-4 py-2 rounded-xl text-white shadow-sm">
                            VOLUNTEER
                          </button>
                        )}
                        {currentRole === 'coordinator' && request.status !== 'fulfilled' && (
                          <button onClick={() => fulfillRequest(request.id)} className="w-full md:w-auto text-xs bg-slate-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                            MARK DONE
                          </button>
                        )}
                        {request.status === 'fulfilled' && (
                          <span className="text-xs text-emerald-600 font-black flex items-center gap-1 justify-center w-full md:w-auto">
                            <CheckCircle className="h-3.5 w-3.5" /> Fulfilled
                          </span>
                        )}
                        {currentRole === 'patient' && request.status === 'pending' && (
                          <span className="text-[11px] text-slate-400 font-bold italic">Searching network...</span>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="p-16 text-center text-slate-400 font-medium">
                      No matching requirements actively logged. Create one above to trigger stock calculations.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── INVENTORY TAB ─── */}
            {activeTab === 'inventory' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900">Live Inventory Verification</h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Quantified distribution synchronized with registered medical bases</p>
                  </div>
                  <div className="text-xs px-3.5 py-1.5 bg-red-50 text-red-600 rounded-full font-black tracking-wider border border-red-100 animate-pulse">
                    ⚡ REALTIME FEED
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {CITIES.map(city => {
                    const cityInv = inventory[city] || {};
                    const totalUnits = Object.values(cityInv).reduce((sum, val) => sum + val, 0);

                    return (
                      <div key={city} className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-x-2.5">
                            <MapPin className="text-red-600 h-5 w-5" />
                            <span className="text-xl font-black text-slate-900">{city}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-3xl font-black text-slate-900 tracking-tight leading-none">{totalUnits}</div>
                            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Total Units</span>
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          {BLOOD_TYPES.map(type => {
                            const units = cityInv[type] || 0;
                            const isCritical = units < 12;
                            return (
                              <div key={type} className="flex items-center justify-between text-xs">
                                <div className="w-12 font-black font-mono text-slate-800">
                                  <span className={type.includes('-') ? 'text-red-600 bg-red-50/80 px-1 py-0.5 rounded' : ''}>{type}</span>
                                </div>
                                
                                <div className="flex-1 h-2 bg-slate-100 mx-3 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-red-500' : units > 25 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${Math.min(100, (units / 50) * 100)}%` }}
                                  />
                                </div>

                                <div className={`w-16 text-right tabular-nums font-black ${isCritical ? 'text-red-600' : 'text-slate-700'}`}>
                                  {units} <span className="text-[9px] text-slate-400 font-bold">U</span>
                                </div>
                                {isCritical && (
                                  <span title="Low reserve warning"><AlertCircle className="h-3.5 w-3.5 text-red-500 ml-1.5 animate-bounce shrink-0" /></span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 font-medium text-center">
                  💡 <span className="font-bold text-slate-700">How verification works:</span> When a patient logs a requested group + quantity, the backend checks specific city objects immediately. If fully stocked, it sends a confirmed reservation notification to both parties.
                </div>
              </motion.div>
            )}

            {/* ─── DONORS TAB ─── */}
            {activeTab === 'donors' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900">Voluntary Donor Network</h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Recurring compatibilities prioritized for routine care</p>
                  </div>
                  <button onClick={() => setShowDonorModal(true)} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black flex items-center gap-x-2 shadow-lg shadow-red-200 transition-colors">
                    <Plus className="h-4 w-4" /> ADD VOLUNTEER PROFILE
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {donors.map(donor => (
                    <div key={donor.id} className="bg-white rounded-3xl p-7 flex flex-col sm:flex-row gap-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="h-14 w-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0 text-2xl self-start">
                        🩸
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-black text-xl text-slate-900">{donor.name}</div>
                            <div className="font-mono text-red-600 text-2xl font-black mt-0.5">{donor.bloodType}</div>
                          </div>
                          <span className={`text-[10px] px-3 py-1 rounded-full font-black tracking-wider ${donor.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                            {donor.isActive ? 'AVAILABLE' : 'STANDBY'}
                          </span>
                        </div>

                        <div className="mt-4 text-xs flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-600 font-bold">
                          <div className="flex items-center gap-x-1.5">
                            <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" /> {donor.city}
                          </div>
                          <div className="flex items-center gap-x-1.5">
                            <Calendar className="h-3.5 w-3.5 text-red-500 shrink-0" /> {donor.lastDonated}
                          </div>
                        </div>

                        <div className="mt-2.5 text-xs text-slate-500 font-semibold flex items-center gap-x-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {donor.phone}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                          <span className="text-slate-400 font-bold">Willingness trigger:</span> {donor.availability}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 text-xs text-slate-600 font-medium leading-relaxed shadow-sm">
                  <span className="font-bold text-slate-900">AI-Enabled Engagement Continuum:</span> The system monitors recurring transfusion cycles typical for chronic blood conditions. It surfaces preferred local donors matching antigen sets to maximize safety profiles and mitigate multiple-donor antibody formation risks.
                </div>
              </motion.div>
            )}

            {/* ─── AI MATCHER ─── */}
            {activeTab === 'ai' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 text-red-600 rounded-3xl mb-4 shadow-md border border-red-100">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h1 className="text-4xl font-black tracking-tight text-slate-900">AI Care Coordinator</h1>
                  <p className="mt-2 text-slate-500 text-xs font-bold max-w-sm mx-auto">
                    Context-aware matching assistant interacting natively across user requests
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-2 border border-slate-200 shadow-xl">
                  <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 min-h-[440px] flex flex-col justify-between">
                    <div className="overflow-auto space-y-4 max-h-[340px] pr-2">
                      {aiMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-red-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-200 border border-slate-700'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isProcessing && (
                        <div className="flex items-center gap-x-2 text-xs text-red-400 pl-2 font-bold animate-pulse">
                          <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping"></span>
                          ANALYZING ECOSYSTEM VECTOR DATA...
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2">
                      <input
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendAIMessage()}
                        placeholder="Type question e.g. 'How much O- stock is in Mumbai right now?'"
                        className="flex-1 bg-slate-800 border border-slate-700 focus:border-red-500 placeholder:text-slate-500 rounded-xl px-4 py-3 text-xs text-white outline-none transition-colors"
                      />
                      <button
                        onClick={sendAIMessage}
                        disabled={isProcessing}
                        className="bg-red-600 text-white px-6 rounded-xl hover:bg-red-500 transition-colors font-black text-xs shrink-0"
                      >
                        SEND
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center text-[11px] text-slate-400 font-bold">
                  Remembers compatibility matrices and checks global React component state instantaneously.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ REQUEST MODAL ═══ */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-xs p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <div className="text-red-600 text-[10px] tracking-widest font-black uppercase">URGENT LOOKUP</div>
                    <div className="text-2xl font-black text-slate-900 mt-0.5">Request Compatibility Match</div>
                  </div>
                  <button onClick={() => setShowRequestModal(false)} className="text-3xl font-light text-slate-400 hover:text-slate-900 leading-none">×</button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1 uppercase">PATIENT / WARRIOR NAME</label>
                    <input type="text" value={newRequest.patientName} onChange={(e) => setNewRequest({ ...newRequest, patientName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1 uppercase">BLOOD GROUP</label>
                      <select value={newRequest.bloodType} onChange={(e) => setNewRequest({ ...newRequest, bloodType: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-xl px-4 py-3 outline-none text-sm font-bold font-mono transition-colors">
                        {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1 uppercase">UNITS REQUIRED</label>
                      <div className="flex border border-slate-200 bg-slate-50 rounded-xl overflow-hidden">
                        <button type="button" onClick={() => setNewRequest({ ...newRequest, units: Math.max(1, newRequest.units - 1) })} className="w-10 text-xl font-bold text-slate-500 hover:text-red-600 transition-colors">-</button>
                        <input type="text" value={newRequest.units} readOnly className="flex-1 text-center bg-transparent text-lg font-black text-slate-900 outline-none" />
                        <button type="button" onClick={() => setNewRequest({ ...newRequest, units: newRequest.units + 1 })} className="w-10 text-xl font-bold text-slate-500 hover:text-red-600 transition-colors">+</button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1 uppercase">VERIFICATION LOCATION</label>
                    <select value={newRequest.city} onChange={(e) => setNewRequest({ ...newRequest, city: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-xl px-4 py-3 outline-none text-sm font-bold transition-colors">
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-2 uppercase">URGENCY SIGNAL</label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map(level => (
                        <button type="button" key={level} onClick={() => setNewRequest({ ...newRequest, urgency: level })} className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all capitalize ${
                          newRequest.urgency === level
                            ? level === 'high' ? 'bg-red-600 text-white shadow-md' : level === 'medium' ? 'bg-orange-500 text-white shadow-md' : 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}>
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1 uppercase">CLINICAL CONTEXT NOTES</label>
                    <textarea value={newRequest.notes} onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })} className="w-full h-20 resize-none bg-slate-50 border border-slate-200 focus:border-red-500 rounded-xl p-3 outline-none text-xs transition-colors font-medium" placeholder="Specify multi-transfusion status, hospital care desk instructions..." />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 flex gap-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 py-3 text-xs font-bold border border-slate-300 rounded-xl hover:bg-white text-slate-700 transition-colors">
                  CANCEL
                </button>
                <button type="button" onClick={submitBloodRequest} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-colors text-xs tracking-wider shadow-md shadow-red-200">
                  VERIFY AVAILABILITY
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ MATCH SUCCESS MODAL ═══ */}
      <AnimatePresence>
        {showMatchModal && selectedRequest && (
          <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="max-w-md w-full bg-white rounded-3xl text-center p-8 shadow-2xl border border-slate-200">
              <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 shadow-sm">
                <CheckCircle className="h-10 w-10" />
              </div>

              <div className="text-emerald-600 text-xs font-black tracking-widest uppercase">INSTANT VERIFICATION SUCCESS</div>
              <div className="text-3xl font-black mt-1 text-slate-900">Blood Stock Verified</div>

              <div className="my-6 bg-emerald-50/50 rounded-2xl p-4 text-left text-xs space-y-3 border border-emerald-100/60 font-medium">
                <div className="flex justify-between border-b border-emerald-100 pb-2">
                  <div className="text-slate-500">Requested Reserve</div>
                  <div><span className="font-bold text-slate-900">{selectedRequest.units} units</span> of <span className="font-bold text-red-600 font-mono">{selectedRequest.bloodType}</span></div>
                </div>
                <div className="flex justify-between border-b border-emerald-100 pb-2">
                  <div className="text-slate-500">Verified Origin Desk</div>
                  <div className="font-bold text-slate-900">{selectedRequest.city} Blood Bridge Hub</div>
                </div>
                {selectedRequest.matchedDonor && (
                  <div className="flex justify-between">
                    <div className="text-slate-500">Cross-Matched Donor Profile</div>
                    <div className="font-black text-emerald-700">{selectedRequest.matchedDonor}</div>
                  </div>
                )}
              </div>

              <div className="text-xs leading-relaxed text-slate-600 mb-6 font-medium">
                The requested blood type has been held securely in {selectedRequest.city}. 
                An instant push alert has been pushed to the authorized donor and medical care delivery driver.
              </div>

              <button onClick={() => { setShowMatchModal(false); setSelectedRequest(null); }} className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs transition-colors shadow-md shadow-red-200 uppercase tracking-wider">
                CONFIRM RECEIPT & RETURN
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ ADD DONOR MODAL ═══ */}
      <AnimatePresence>
        {showDonorModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-black text-2xl text-slate-900">Volunteer Enlistment</h3>
                    <p className="text-[11px] text-slate-400 font-bold mt-0.5">Adds profile to state array & increments stock</p>
                  </div>
                  <button onClick={() => setShowDonorModal(false)} className="text-2xl font-light text-slate-400 hover:text-slate-900">×</button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-600 block mb-1 uppercase tracking-wider">DONOR NAME</label>
                    <input className="bg-slate-50 w-full rounded-xl px-4 py-2.5 text-xs font-bold outline-none border border-slate-200 focus:border-red-500 transition-colors" value={newDonor.name} onChange={e => setNewDonor({ ...newDonor, name: e.target.value })} placeholder="Enter donor name" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-600 block mb-1 uppercase tracking-wider">GROUP</label>
                      <select className="bg-slate-50 w-full rounded-xl px-3 py-2.5 text-xs font-bold font-mono outline-none border border-slate-200 focus:border-red-500 transition-colors" value={newDonor.bloodType} onChange={e => setNewDonor({ ...newDonor, bloodType: e.target.value })}>
                        {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-600 block mb-1 uppercase tracking-wider">CITY HUB</label>
                      <select className="bg-slate-50 w-full rounded-xl px-3 py-2.5 text-xs font-bold outline-none border border-slate-200 focus:border-red-500 transition-colors" value={newDonor.city} onChange={e => setNewDonor({ ...newDonor, city: e.target.value })}>
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 block mb-1 uppercase tracking-wider">MOBILE CONTACT</label>
                    <input className="bg-slate-50 w-full rounded-xl px-4 py-2.5 text-xs font-bold outline-none border border-slate-200 focus:border-red-500 transition-colors" value={newDonor.phone} onChange={e => setNewDonor({ ...newDonor, phone: e.target.value })} placeholder="+91 9XXXX XXXXX" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 block mb-1 uppercase tracking-wider">PARTICIPATION WINDOW</label>
                    <input className="bg-slate-50 w-full rounded-xl px-4 py-2.5 text-xs font-bold outline-none border border-slate-200 focus:border-red-500 transition-colors" value={newDonor.availability} onChange={e => setNewDonor({ ...newDonor, availability: e.target.value })} placeholder="e.g. Weekends, Monthly cycles" />
                  </div>
                </div>
              </div>

              <div className="flex border-t border-slate-200 bg-slate-50">
                <button type="button" onClick={() => setShowDonorModal(false)} className="flex-1 py-3.5 text-xs font-bold text-slate-600 border-r border-slate-200 hover:bg-white transition-colors">CANCEL</button>
                <button
                  type="button"
                  onClick={addNewDonor}
                  className="flex-1 py-3.5 bg-red-600 text-xs font-black text-white hover:bg-red-700 transition-colors tracking-wider"
                >
                  SAVE & UPDATE STOCK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ NOTIFICATIONS DRAWER ═══ */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <div className="fixed inset-0 z-[90] bg-black/20" onClick={() => setShowNotifications(false)} />
            <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} className="fixed top-16 right-4 sm:right-6 z-[100] w-80 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between text-xs font-black text-slate-800 bg-slate-50">
                <div className="flex items-center gap-x-2">
                  <Bell className="h-3.5 w-3.5 text-red-600" /> SYSTEM LOG MESSAGES
                </div>
                <button className="text-red-600 hover:text-red-700 font-bold text-[10px] underline" onClick={() => { setNotifications(n => n.map(nn => ({ ...nn, read: true }))); }}>MARK ALL READ</button>
              </div>

              <div className="max-h-[380px] overflow-auto">
                {notifications.length > 0 ? notifications.map((notif, index) => (
                  <div key={index} className={`px-5 py-3.5 border-b border-slate-100 last:border-none ${!notif.read ? 'bg-red-50/50' : ''}`}>
                    <div className="flex justify-between text-[11px] font-black">
                      <div className={`${notif.type === 'success' ? 'text-emerald-700' : notif.type === 'warning' ? 'text-orange-600' : 'text-blue-600'}`}>
                        {notif.title}
                      </div>
                      <div className="text-slate-400 font-medium">{notif.time}</div>
                    </div>
                    <div className="text-xs mt-1 text-slate-600 font-medium leading-relaxed">{notif.message}</div>
                  </div>
                )) : <div className="p-10 text-center text-xs text-slate-400 font-bold">No unread routing broadcasts</div>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ FLOATING AI CHAT ═══ */}
      {!aiChatOpen && (
        <button onClick={() => setAiChatOpen(true)} className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 h-14 w-14 sm:h-16 sm:w-16 bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-xl shadow-red-200 flex items-center justify-center rounded-full z-50">
          <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
        </button>
      )}

      <AnimatePresence>
        {aiChatOpen && (
          <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-[calc(100vw-32px)] sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 z-[200] overflow-hidden flex flex-col" style={{ height: '480px' }}>
            <div className="bg-red-600 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-x-2.5">
                <div className="bg-white/20 rounded-lg p-1.5">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-black text-xs text-white">AI Care Coordinator</div>
                  <div className="text-[9px] text-red-100 font-bold -mt-0.5">Live Vector Embedding Simulator</div>
                </div>
              </div>
              <button onClick={() => setAiChatOpen(false)} className="text-2xl text-white/70 hover:text-white leading-none transition-colors">×</button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-50">
              {aiMessages.map((message, idx) => (
                <div key={idx} className={`flex ${message.role === "user" ? "justify-end" : ""}`}>
                  <div className={`px-4 py-2.5 max-w-[85%] rounded-2xl font-medium leading-relaxed ${
                    message.role === "user" 
                      ? "bg-red-600 text-white font-bold" 
                      : "bg-white text-slate-800 border border-slate-200 shadow-xs"
                  }`}>
                    {message.content}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="text-[10px] font-bold text-red-500 italic">Evaluating cross-matches...</div>
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-white">
              <div className="flex rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendAIMessage();
                  }}
                  placeholder="Ask for real-time stock..."
                  className="flex-1 bg-transparent px-3 py-2.5 outline-none text-xs text-slate-900 placeholder:text-slate-400 font-medium"
                />
                <button
                  type="button"
                  onClick={sendAIMessage}
                  disabled={isProcessing}
                  className="bg-red-600 px-4 rounded-r-xl text-[10px] font-black text-white disabled:opacity-40 hover:bg-red-700 transition-colors shrink-0"
                >
                  SEND
                </button>
              </div>
              <div className="text-center text-[9px] text-slate-400 mt-2 font-bold">Responds using contextual memory buffers</div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
