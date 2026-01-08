import React, { useEffect, useState, useRef } from "react";
import { Search, Bell, MessageCircle, Menu, ChevronDown } from "lucide-react";
import axios from "axios";
import { baseUrl } from "../../utils/ApiConstants";

import { useNavigate } from "react-router-dom";


const CandidateHeader = ({ onMenuToggle }) => {
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
        // Close dropdown on outside click
        useEffect(() => {
            function handleClickOutside(event) {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                    setDropdownOpen(false);
                }
            }
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);
        const handleLogout = () => {
            localStorage.removeItem('candidateToken');
            localStorage.removeItem('candidate');
            navigate('/Candidatelogin');
        };

        const handleProfile = () => {
            setDropdownOpen(false);
            navigate('/Candidate-Dashboard/CandidateProfile');
        };
    const [dateTime, setDateTime] = useState("");

    const formatDateTime = () => {
        const now = new Date();

        const date = now.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });

        const time = now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        return `${date} | ${time}`;
    };

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem("candidateToken");
                const res = await axios.get(`${baseUrl}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                console.log("Checking problem:", res.data);
                
                setUser(res.data.data);
            } catch (err) {
                console.error("Error fetching user:", err);
            }
        };

        fetchUser();
        setDateTime(formatDateTime());
    }, []);

    return (
        <header className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onMenuToggle}
                        className="lg:hidden p-2 rounded hover:bg-gray-100"
                    >
                        <Menu size={20} />
                    </button>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                            Welcome, {user?.name || "..."}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {dateTime}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    {/* <button className="p-2 rounded-full hover:bg-gray-100 relative">
                        <MessageCircle size={20} className="text-gray-600" />
                    </button>
                    <button className="p-2 rounded-full hover:bg-gray-100 relative">
                        <Bell size={20} className="text-gray-600" />
                    </button> */}

                    <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {user?.name ? user.name[0].toUpperCase() : "?"}
                        </div>

                        <div className="relative hidden sm:block" ref={dropdownRef}>
                            <button
                                className="flex items-center gap-1 text-sm font-medium text-gray-700 focus:outline-none"
                                onClick={() => setDropdownOpen((prev) => !prev)}
                            >
                                {user?.name || "Loading..."}
                                <ChevronDown size={18} className="ml-1" />
                            </button>
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 animate-fade-in">
                                    <button
                                        onClick={handleProfile}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 rounded-t-lg"
                                    >
                                        Profile
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 rounded-b-lg"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </header>
    );
};

export default CandidateHeader;
