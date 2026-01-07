import React, { useEffect, useState } from "react";
import { Search, Bell, MessageCircle, Menu, ChevronDown } from "lucide-react";
import axios from "axios";
import { baseUrl } from "../../utils/ApiConstants";

const RecruiterAdminHeader = ({ onMenuToggle }) => {
    const [user, setUser] = useState(null);
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
                const token = localStorage.getItem("token");
                const res = await axios.get(`${baseUrl}/api/auth/meAll`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                // console.log(res.data.data);
                
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

                        <div className="hidden sm:block">
                            <p className="text-sm font-medium text-gray-700">
                                {user?.name || "Loading..."}
                            </p>
                            <p className="text-sm font-medium text-gray-700">
                                {user?.role || "Role..."}
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </header>
    );
};

export default RecruiterAdminHeader;
