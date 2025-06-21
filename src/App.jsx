import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Header from './components/Header';
import MobileMenu from './components/MobileMenu';
import LoginPage from './pages/LoginPage';
import AttendancePage from './pages/AttendancePage';
import InfoPage from './pages/InfoPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

function App() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUserString = localStorage.getItem('user');
        setIsLoading(true);
        if (token && storedUserString) {
            try {
                const storedUser = JSON.parse(storedUserString);
                setIsLoggedIn(true);
                setUser(storedUser);
                if ((location.pathname === '/login' || location.pathname === '/') && storedUser) {
                     navigate(storedUser.role === 'admin' ? '/admin' : '/attendance', { replace: true });
                }
            } catch (e) {
                console.error("Error parsing stored user data:", e);
                localStorage.removeItem('token'); localStorage.removeItem('user');
                setIsLoggedIn(false); setUser(null);
                if (location.pathname !== '/login') navigate('/login', { replace: true });
            }
        } else {
            setIsLoggedIn(false); setUser(null);
            if (location.pathname !== '/login') navigate('/login', { replace: true });
        }
        setIsLoading(false);
    }, []);

     useEffect(() => {
        if (!isLoading) {
            if (isLoggedIn && user) {
                if (location.pathname === '/login' || location.pathname === '/') {
                    navigate(user.role === 'admin' ? '/admin' : '/attendance', { replace: true });
                }
            } else if (!isLoggedIn) {
                if (location.pathname !== '/login') {
                    navigate('/login', { replace: true });
                }
            }
        }
    }, [isLoggedIn, user, location.pathname, navigate, isLoading]);

    const handleUserUpdate = (updatedUserData) => {
        setUser(prevUser => {
            const newUser = { ...prevUser, ...updatedUserData };
            localStorage.setItem('user', JSON.stringify(newUser));
            return newUser;
        });
    };

    const handleNavigate = (page) => {
        if (page === 'logout') handleLogout();
        else navigate(`/${page}`);
        setIsMobileMenuOpen(false);
    };

    const handleLogin = async (usernameInput, passwordInput) => {
        if (!usernameInput || !passwordInput) { alert('Username and password are required.'); return; }
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput, password: passwordInput }),
            });
            const data = await response.json();
            if (response.ok && data.token && data.user) {
                setIsLoggedIn(true); setUser(data.user);
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token', data.token);
                console.log("Login successful via API. Role:", data.user.role);
                navigate(data.user.role === 'admin' ? '/admin' : '/attendance', { replace: true });
            } else {
                alert(data.message || 'Login failed.');
                setIsLoggedIn(false); setUser(null);
                localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('isLoggedIn');
            }
        } catch (error) {
            console.error('Login API call error:', error);
            alert('Error logging in. Ensure backend is running.');
            setIsLoggedIn(false); setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false); setUser(null);
        localStorage.removeItem('isLoggedIn'); localStorage.removeItem('user'); localStorage.removeItem('token');
        localStorage.removeItem('attendanceRecords');
    };

    const getCurrentPageName = () => {
        const path = location.pathname.substring(1);
        if (!path && isLoggedIn && user) return user.role === 'admin' ? 'admin' : 'attendance';
        return path || 'login';
    };

    const ProtectedRoute = ({ children }) => {
        if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>;
        if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />;
        return children;
    };

    const ProtectedAdminRoute = ({ children }) => {
        if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>;
        if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />;
        if (user?.role !== 'admin') return <Navigate to="/attendance" replace />;
        return children;
    };

    if (isLoading && (!isLoggedIn || !user) && location.pathname !== '/login' && location.pathname !== '/') {
        return <div className="min-h-screen flex items-center justify-center"><div>Loading application state...</div></div>;
    }

    return (
        <div className="font-poppins antialiased">
            {isLoggedIn && user && (
                <>
                    <Header onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} onNavigate={handleNavigate} currentPageName={getCurrentPageName()} userRole={user?.role} />
                    <MobileMenu isOpen={isMobileMenuOpen} onNavigate={handleNavigate} onClose={() => setIsMobileMenuOpen(false)} currentPageName={getCurrentPageName()} userRole={user?.role} />
                </>
            )}
            <main className={isLoggedIn && user ? "pt-16" : ""}>
                <Routes>
                    <Route path="/login" element={isLoggedIn && user ? <Navigate to={user.role === 'admin' ? "/admin" : "/attendance"} replace /> : <LoginPage onLogin={handleLogin} />} />
                    <Route path="/attendance" element={<ProtectedRoute><AttendancePage user={user} /></ProtectedRoute>} />
                    <Route path="/info" element={<ProtectedRoute><InfoPage user={user} /></ProtectedRoute>} />
                    <Route path="/profile" element={
                        <ProtectedRoute>
                            <ProfilePage user={user} onUserUpdate={handleUserUpdate} />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin" element={<ProtectedAdminRoute><AdminPage /></ProtectedAdminRoute>} />
                    <Route path="/*" element={<Navigate to={isLoggedIn && user ? (user.role === 'admin' ? "/admin" : "/attendance") : "/login"} replace />} />
                </Routes>
            </main>
        </div>
    );
}
export default App;