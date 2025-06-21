import React from 'react';
import { Link } from 'react-router-dom';

const Icon = ({ iconClass }) => <i className={iconClass}></i>;

function Header({ onToggleMobileMenu, onNavigate, currentPageName, userRole }) {
    const employeeCommonLinks = [
        { page: 'attendance', icon: 'fas fa-calendar-check', label: 'Attendance' },
        { page: 'info', icon: 'fas fa-chart-bar', label: 'Dashboard' },
        { page: 'profile', icon: 'fas fa-user', label: 'Profile' },
    ];
    const adminBaseLink = { page: 'admin', icon: 'fas fa-user-shield', label: 'Admin Panel' };
    let displayedNavLinks = [];

    if (userRole === 'admin') {
        if (currentPageName === 'admin') {
            displayedNavLinks = [adminBaseLink];
        } else {
            displayedNavLinks = [adminBaseLink, ...employeeCommonLinks];
        }
    } else {
        displayedNavLinks = employeeCommonLinks;
    }

    return (
        <header className="bg-gradient-to-r from-bright-blue to-hot-pink text-white p-4 shadow-md fixed w-full top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center">
                    <button className="hamburger mr-4 text-2xl md:hidden" onClick={onToggleMobileMenu}><Icon iconClass="fas fa-bars" /></button>
                    <Link to={userRole === 'admin' ? "/admin" : "/attendance"} className="text-xl font-bold">AttendTrack</Link>
                </div>
                <nav className="hidden md:block">
                    <ul className="flex space-x-6 items-center">
                        {displayedNavLinks.map(link => (
                            <li key={link.page}>
                                <button onClick={() => onNavigate(link.page)} title={link.label} className={`p-2 rounded-md transition-all duration-300 ease ${currentPageName === link.page ? 'text-light-pink bg-white/20 transform scale-110' : 'text-white hover:text-light-pink hover:bg-white/10'}`}>
                                    <Icon iconClass={link.icon} />
                                </button>
                            </li>
                        ))}
                        <li><button onClick={() => onNavigate('logout')} title="Logout" className="p-2 rounded-md text-white hover:text-light-pink hover:bg-white/10 transition-all duration-300 ease"><Icon iconClass="fas fa-sign-out-alt" /></button></li>
                    </ul>
                </nav>
            </div>
        </header>
    );
}
export default Header;