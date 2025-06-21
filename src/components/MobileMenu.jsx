import React from 'react';

const Icon = ({ iconClass }) => <i className={iconClass}></i>;

function MobileMenu({ isOpen, onClose, onNavigate, currentPageName, userRole }) {
    if (!isOpen) return null;

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
        <><div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose}></div><div className={`fixed top-0 w-3/4 max-w-xs h-full bg-white p-5 z-50 shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${isOpen ? 'left-0' : '-left-full'}`}><div className="flex justify-between items-center mb-10 border-b pb-4"><h2 className="text-2xl font-bold text-hot-pink">Menu</h2><button onClick={onClose} className="text-2xl text-gray-500 hover:text-hot-pink"><Icon iconClass="fas fa-times" /></button></div><ul className="space-y-5">{displayedNavLinks.map(link => (<li key={link.page}><button onClick={() => onNavigate(link.page)} className={`w-full flex items-center p-3 rounded-lg text-lg hover:bg-gray-100 transition-colors duration-200 text-left ${currentPageName === link.page ? 'text-hot-pink font-semibold bg-pink-50' : 'text-gray-700'}`}><Icon iconClass={`${link.icon} mr-4 text-bright-blue w-6 text-center`} />{link.label}</button></li>))}<li className="pt-5 border-t mt-5"><button onClick={() => onNavigate('logout')} className="w-full flex items-center p-3 rounded-lg text-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 text-left"><Icon iconClass="fas fa-sign-out-alt mr-4 text-bright-blue w-6 text-center" />Logout</button></li></ul></div></>
    );
}
export default MobileMenu;