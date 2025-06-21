import React, { useState, useEffect, useCallback } from 'react';

const InfoCard = ({ title, value, color, icon, unit = "" }) => (

    <div className={`
        bg-white p-6 rounded-xl shadow-lg text-center 
        transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 
        border-t-4 ${color.replace('text-', 'border-')}
    `}>
        <div>
            <div className={`text-4xl mb-3 ${color}`}>
                <i className={`fas ${icon}`}></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-1">{title}</h3>
        </div>
        <p className={`text-5xl font-bold ${color}`}>
            {value}
            {unit && <span className="text-3xl ml-1">{unit}</span>}
        </p>
    </div>
);

function InfoPage({ user }) {
    const [summaryData, setSummaryData] = useState({
        daysWithActivity: 0,
        daysPresent: 0,
        daysAbsent: 0
    });
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchUserSummary = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token || !user?.id) {
            setMessage("Authentication error or user data missing for summary.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setMessage('');
        try {
            const response = await fetch('http://localhost:3001/api/attendance/my-summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSummaryData({
                    daysWithActivity: data.daysWithActivity || 0,
                    daysPresent: data.daysPresent || 0,
                    daysAbsent: data.daysAbsent || 0,
                });
            } else {
                const errData = await response.json().catch(() => ({message: "Failed to parse error from summary API."}));
                setMessage(`Error: ${errData.message || 'Failed to fetch summary data.'}`);
            }
        } catch (err) {
            console.error("Fetch user summary API error:", err);
            setMessage('Network error or server unavailable while fetching summary.');
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user?.id) {
            fetchUserSummary();
        }
    }, [user, fetchUserSummary]);

    return (
        <div className="min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] py-10 px-4 ">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10 sm:mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">
                        Welcome back, {user?.fullName || 'User'}!
                    </h2>
                    <p className="text-lg mt-2">
                        Here is your attendance summary.
                    </p>
                </div>

                {message && <p className={`text-center text-sm p-2 rounded-md mb-4 ${message.toLowerCase().includes("error") ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100'}`}>{message}</p>}
                {isLoading && <p className="text-center text-blue-600">Loading summary...</p>}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
                    <InfoCard 
                        title="Days with Activity" 
                        value={summaryData.daysWithActivity} 
                        color="text-purple-500" 
                        icon="fa-calendar-check" 
                        unit="days" 
                    />
                    <InfoCard 
                        title="Days Present" 
                        value={summaryData.daysPresent} 
                        color="text-green-500" 
                        icon="fa-user-check" 
                        unit="days" 
                    />
                    <InfoCard 
                        title="Days Absent" 
                        value={summaryData.daysAbsent} 
                        color="text-red-500" 
                        icon="fa-user-times" 
                        unit="days" 
                    />
                </div>
            </div>
        </div>
    );
}

export default InfoPage;