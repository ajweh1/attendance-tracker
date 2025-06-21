import React, { useState, useEffect } from 'react';

const Icon = ({ iconClass }) => <i className={iconClass}></i>;

const ProfileDetail = ({ label, value, icon, color = "text-bright-blue" }) => (
    <div className="flex items-center"><div className="w-10 text-center"><i className={`fas ${icon} text-xl ${color}`}></i></div><div className="ml-4"><p className="text-sm text-gray-500">{label}</p><p className="font-semibold text-gray-700">{value}</p></div></div>
);

function ProfilePage({ user, onUserUpdate }) {
    const [isEditMode, setIsEditMode] = useState(false);

    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [previewPictureUrl, setPreviewPictureUrl] = useState(null);
    
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user && user.profile_picture_url) {
            setPreviewPictureUrl(`http://localhost:3001/uploads/${user.profile_picture_url}`);
        } else {
            setPreviewPictureUrl(null);
        }
    }, [user]);

    const handlePictureChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfilePictureFile(file);
            setPreviewPictureUrl(URL.createObjectURL(file));
        }
    };

    const handleSaveChanges = async (e) => {
        e.preventDefault();
        
        if (!profilePictureFile) {
            setMessage("No new picture selected to save.");
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        const formData = new FormData();
        formData.append('profilePicture', profilePictureFile); 

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/profile/update-picture', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message || "Profile picture updated successfully!");
                onUserUpdate({ profile_picture_url: data.profilePictureUrl }); 
                setProfilePictureFile(null); 
                setTimeout(() => {
                    setIsEditMode(false);
                }, 2000);
            } else {
                setMessage(`Error: ${data.message || 'Failed to upload picture.'}`);
            }
        } catch (err) {
            setMessage("Network error or server unavailable while uploading picture. Ensure backend is running.");
            console.error("Upload picture API error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleCancel = () => {
        setIsEditMode(false);
        if (user && user.profile_picture_url) {
            setPreviewPictureUrl(`http://localhost:3001/uploads/${user.profile_picture_url}`);
        } else {
            setPreviewPictureUrl(null);
        }
        setProfilePictureFile(null);
    };

    const displayUser = user || {};
    const profileImageUrl = previewPictureUrl || 
                           (user?.profile_picture_url ? `http://localhost:3001/uploads/${user.profile_picture_url}` : 
                           `https://placehold.co/128x128/9CA3AF/FFFFFF?text=${(displayUser.fullName || '?').charAt(0)}`);

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-10 px-4 ">
            <div className="max-w-lg w-full bg-white p-8 sm:p-10 rounded-xl shadow-xl">
                {isEditMode ? (
                    <form onSubmit={handleSaveChanges}>
                        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Edit Profile Picture</h2>
                        <div className="text-center mb-6">
                            <img src={profileImageUrl} alt="Profile Preview" className="w-32 h-32 mx-auto rounded-full object-cover shadow-lg" />
                            <label htmlFor="profile-picture-upload" className="cursor-pointer mt-4 inline-block bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg"><Icon iconClass="fas fa-camera mr-2" /> Change Picture</label>
                            <input id="profile-picture-upload" type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
                        </div>
                        {message && <p className={`text-center text-sm p-2 rounded-md mb-4 ${message.toLowerCase().includes("error") || message.toLowerCase().includes("unavailable") ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</p>}
                        <div className="flex gap-4 mt-8">
                            <button type="button" onClick={handleCancel} className="w-full py-3 px-8 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition-colors duration-150">Cancel</button>
                            <button type="submit" disabled={isSubmitting || !profilePictureFile} className="w-full py-3 px-8 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors duration-150 disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center">
                        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-hot-pink flex items-center justify-center shadow-lg ring-4 ring-white/50">
                            <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800">{displayUser.fullName || displayUser.name}</h2>
                        <p className="text-gray-500 text-lg mb-1">@{displayUser.username}</p>
                        <p className="text-gray-500 text-sm mb-6 capitalize">{displayUser.role}</p>
                        <div className="text-left space-y-4 border-t border-b border-gray-200 py-6 my-6">
                            <ProfileDetail label="Member Since" value={new Date(user?.memberSince || Date.now()).toLocaleDateString()} icon="fa-calendar-check" />
                            <ProfileDetail label="Status" value="Active" icon="fa-check-circle" color="text-green-500" />
                        </div>
                        <button type="button" onClick={() => setIsEditMode(true)} className="mt-6 w-full sm:w-auto py-3 px-8 bg-bright-blue text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-bright-blue focus:ring-offset-2">Edit Profile</button>
                    </div>
                )}
            </div>
        </div>
    );
}
export default ProfilePage;