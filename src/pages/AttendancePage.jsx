import React, { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; 

const formatDateToYYYYMMDD = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatTimeToAMPM = (dateTimeStringOrDate) => {
    if (!dateTimeStringOrDate) return '--:--';
    const dateObj = typeof dateTimeStringOrDate === 'string' ? new Date(dateTimeStringOrDate) : dateTimeStringOrDate;
    if (isNaN(dateObj.getTime())) return '--:--';
    return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};

function AttendancePage({ user }) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState({});
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchUserAttendanceRecords = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token || !user?.id) {
            setMessage("Authentication error or user data missing.");
            return;
        }
        setIsLoading(true);
        setMessage('');
        try {
            const response = await fetch('http://localhost:3001/api/attendance/my-records', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const recordsArray = await response.json();
                const recordsObject = {};
                recordsArray.forEach(record => {
                    const dateKey = record.attendance_date.split('T')[0];
                    recordsObject[dateKey] = record;
                });
                setAttendanceData(recordsObject);
            } else {
                const errData = await response.json().catch(() => ({ message: 'Failed to parse error from fetching records.'}));
                setMessage(`Error: ${errData.message || 'Failed to fetch attendance records.'}`);
            }
        } catch (err) {
            console.error("Fetch user attendance API error:", err);
            setMessage('Network error or server unavailable while fetching records.');
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user?.id) {
            fetchUserAttendanceRecords();
        }
    }, [user, fetchUserAttendanceRecords]);

    const currentRecordDateKey = formatDateToYYYYMMDD(selectedDate);
    const currentRecord = attendanceData[currentRecordDateKey] || {};

    const isTodaySelected = formatDateToYYYYMMDD(selectedDate) === formatDateToYYYYMMDD(new Date());
    const canCheckInOutToday = isTodaySelected && !(currentRecord.status === 'Absent' || currentRecord.status === 'Holiday');
    const isCheckedInForSelectedDate = currentRecord.check_in_time && !currentRecord.check_out_time;
    const isAttendanceFinalizedForSelectedDate = (currentRecord.check_in_time && currentRecord.check_out_time) || currentRecord.status === 'Absent' || currentRecord.status === 'Holiday';

    const handleDateChange = (date) => {
        setSelectedDate(date);
        setMessage('');
    };

    const handleCheckInOutAPI = async () => {
        const token = localStorage.getItem('token');
        if (!token) { setMessage("Authentication error."); return; }
        if (!isTodaySelected) { setMessage("Check-in/out only allowed for today's date."); return; }

        const action = isCheckedInForSelectedDate ? 'check-out' : 'check-in';
        setMessage(''); setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:3001/api/attendance/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(data.message);
                fetchUserAttendanceRecords();
            } else {
                setMessage(`Error: ${data.message || `Failed to ${action}`}`);
            }
        } catch (err) {
            console.error(`API ${action} error:`, err);
            setMessage(`Network error during ${action}.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkDateAsAPI = async (newStatus) => {
        const token = localStorage.getItem('token');
        if (!token) { setMessage("Authentication error."); return; }

        const dateKey = formatDateToYYYYMMDD(selectedDate);
        setMessage(''); setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/attendance/mark-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ date: dateKey, status: newStatus })
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(data.message);
                fetchUserAttendanceRecords();
            } else {
                setMessage(`Error: ${data.message || 'Failed to mark status.'}`);
            }
        } catch (err) {
            console.error("Mark status API error:", err);
            setMessage('Network error while marking status.');
        } finally {
            setIsLoading(false);
        }
    };

    const tileClassName = ({ date, view }) => {
        if (view === 'month') {
            const dateKey = formatDateToYYYYMMDD(date);
            const record = attendanceData[dateKey];
            if (record) {
                if (record.status === 'Present' && record.check_in_time) return 'present-day';
                if (record.status === 'Absent') return 'absent-day';
            }
        }
        return null;
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] py-8 px-4 ">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 py-20">
                <div className="md:col-span-2 bg-white p-5 sm:p-6 rounded-xl shadow-xl">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 text-center">Select Attendance Date</h2>
                    <Calendar
                        onChange={handleDateChange}
                        value={selectedDate}
                        className="mx-auto border-none shadow-sm"
                        tileClassName={tileClassName}
                        maxDate={new Date()}
                        aria-label="Attendance Calendar"
                    />
                </div>

                <div className="bg-white p-5 sm:p-6 rounded-xl shadow-xl text-center">
                    <h3 className="text-xl font-semibold text-gray-700 mb-1">Record for:</h3>
                    <p className="text-lg text-hot-pink font-bold mb-6">
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    {message && <p className={`text-sm p-2 rounded-md mb-4 ${message.toLowerCase().includes("error") ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100'}`}>{message}</p>}
                    {isLoading && <p className="text-sm text-blue-600 mb-4">Processing...</p>}

                    <div className="space-y-2 mb-6 p-4 bg-sky-blue/10 rounded-lg border border-sky-blue/30">
                        <p className="text-sm text-gray-600">Check-in: <span className="font-semibold text-bright-blue text-base">{formatTimeToAMPM(currentRecord.check_in_time)}</span></p>
                        <p className="text-sm text-gray-600">Check-out: <span className="font-semibold text-bright-blue text-base">{formatTimeToAMPM(currentRecord.check_out_time)}</span></p>
                        <p className="text-sm text-gray-600">Status: <span className={`font-semibold text-base ${currentRecord.status === 'Present' ? 'text-green-600' : currentRecord.status === 'Absent' ? 'text-red-600' : 'text-gray-500'}`}>{currentRecord.status || 'Not Marked'}</span></p>
                    </div>

                    <button
                        onClick={handleCheckInOutAPI}
                        disabled={isLoading || !canCheckInOutToday || isAttendanceFinalizedForSelectedDate}
                        className={`w-full py-3 px-4 text-white font-semibold rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 mb-3
                                    ${isCheckedInForSelectedDate ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400' : 'bg-hot-pink hover:bg-pink-700 focus:ring-pink-400'}
                                    ${(!canCheckInOutToday || isAttendanceFinalizedForSelectedDate) ? 'opacity-60 cursor-not-allowed' : ''}
                                  `}
                    >
                        {isLoading ? 'Processing...' : (isCheckedInForSelectedDate ? 'Check Out' : 'Check In')}
                    </button>

                    <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                        <button onClick={() => handleMarkDateAsAPI('Present')} disabled={isLoading || currentRecord.status === 'Present'} className="py-2.5 px-3 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50">Mark Present</button>
                        <button onClick={() => handleMarkDateAsAPI('Absent')} disabled={isLoading || currentRecord.status === 'Absent'} className="py-2.5 px-3 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50">Mark Absent</button>
                        {(currentRecord.status || currentRecord.check_in_time) && (
                            <button onClick={() => handleMarkDateAsAPI('Clear')} disabled={isLoading} className="py-2.5 px-3 bg-gray-400 text-white rounded-md hover:bg-gray-500 col-span-2">Clear Entry</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
export default AttendancePage;