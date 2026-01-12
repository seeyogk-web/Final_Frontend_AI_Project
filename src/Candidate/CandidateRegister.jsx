import React, { useState } from "react";
import img from "../assets/CandidateLogin.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { baseUrl } from "../utils/ApiConstants";
import {
    Eye,
    EyeOff,
    AlertCircle,
    Loader2,
    CheckCircle,
    X,
    Upload,
    FileText
} from "lucide-react";

const CandidateRegister = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: ""
    });
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeBase64, setResumeBase64] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === "phone") {
            const numericValue = value.replace(/[^0-9]/g, "");
            setFormData(prev => ({
                ...prev,
                [name]: numericValue
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
        
        if (error) setError("");
    };

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        
        if (file) {
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                setError("Only PDF, DOC, and DOCX files are allowed");
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                setError("File size must be less than 5MB");
                return;
            }
            
            setResumeFile(file);
            
            try {
                const base64 = await convertToBase64(file);
                setResumeBase64(base64);
            } catch (err) {
                setError("Failed to process file");
            }
            
            if (error) setError("");
        }
    };

    const removeResume = () => {
        setResumeFile(null);
        setResumeBase64("");
    };

    const validateForm = () => {
        const { name, email, phone, password } = formData;

        if (!name || !email || !phone || !password) {
            setError("All fields are required");
            return false;
        }

        if (phone.length !== 10) {
            setError("Phone number must be 10 digits");
            return false;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return false;
        }

        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const hasSmallLetter = /[a-z]/.test(password);
        const hasCapitalLetter = /[A-Z]/.test(password);

        if (!hasNumber || !hasSpecialChar || !hasSmallLetter || !hasCapitalLetter) {
            setError("Password must contain at least one number, special character, uppercase and lowercase letter");
            return false;
        }

        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setLoading(true);
        setError("");

        try {
            const submitData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                resume: resumeBase64 || "" 
            };

            const { data } = await axios.post(
                `${baseUrl}/api/candidate/register`, 
                submitData
            );

            console.log("data here", data);
            

            localStorage.setItem('token', data.token);
            alert("Account successfully created!");
            navigate("/CandidateLogin");
        } catch (err) {
            if (err.response?.data?.error === "Email already exists") {
                alert("Email already registered! Please login.");
            } else {
                setError(err.response?.data?.error || "Registration failed");
            }
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="min-h-screen bg-[#FFFFFF05] py-8">
            <h1 className="text-3xl text-center md:text-4xl font-bold text-gray-900 mb-6">
                Create Your Account
            </h1>
            <div className="flex flex-col md:flex-row items-center justify-between max-w-6xl w-full mx-auto px-4">
                <div className="flex-1 text-center md:text-left mb-10 md:mb-0">
                    <p className="text-2xl text-[#0496FF] text-center font-medium mb-8">
                        Join AIRecruiter Today
                    </p>
                    <img src={img} alt="Illustration" className="h-[400px] w-full md:w-auto mx-auto" />
                </div>

                <div className="flex-1 bg-white rounded-2xl shadow-md border border-gray-100 p-8 max-w-md mx-auto">
                    <div className="mb-4">
                        <label className="block text-gray-800 font-medium mb-1">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-800 font-medium mb-1">
                            Email ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-800 font-medium mb-1">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Enter 10-digit phone number"
                            maxLength="10"
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>

                    {/* Resume Upload Section */}
                    <div className="mb-4">
                        <label className="block text-gray-800 font-medium mb-1">
                            Resume <span className="text-gray-400 text-sm font-normal">(Optional)</span>
                        </label>
                        
                        {!resumeFile ? (
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="p-2 bg-blue-100 rounded-full">
                                            <Upload className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 font-medium">
                                                Click to upload
                                            </span>
                                            <span className="text-sm text-gray-500"> or drag and drop</span>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            PDF, DOC, DOCX (Max 5MB)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-r from-green-50 to-green-100/50 border border-green-300 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <FileText className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 truncate max-w-[180px]">
                                                {resumeFile.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatFileSize(resumeFile.size)}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={removeResume}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Remove file"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-1 mt-2">
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                    <span className="text-xs text-green-700">File ready to upload</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-800 font-medium mb-1">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Create a password"
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Min 8 characters, 1 number, 1 special char, 1 uppercase & 1 lowercase
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md animate-pulse">
                            <p className="text-red-600 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        className="w-full bg-blue-500 text-white py-2.5 rounded-md font-medium hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating Account...
                            </span>
                        ) : (
                            "Create Account"
                        )}
                    </button>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-center text-sm text-gray-600">
                            Already have an account?{" "}
                            <button 
                                onClick={() => navigate("/CandidateLogin")} 
                                className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                            >
                                Login here
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateRegister;