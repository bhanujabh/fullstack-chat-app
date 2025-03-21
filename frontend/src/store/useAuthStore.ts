import {create} from "zustand"
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import {io, Socket} from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001": "/";

interface AuthUser {
    _id: number;
    id: string;
    fullName: string; 
    email: string;
    profilePic?: string;
    createdAt?: string; 
}

interface SignupData {
    fullName: string;
    email: string;
    password: string | number;
}

interface LoginData {
    email: string;
    password: string;
}

interface UpdateProfileData {
    profilePic?: string;
    fullName?: string;
    email?: string;
}
  
interface AuthState {
    authUser: AuthUser | null;
    isSigningUp: boolean;
    isLoggingIn: boolean;
    isUpdatingProfile: boolean;
    isCheckingAuth: boolean;
    onlineUsers: string[];
    socket: Socket | null;
    checkAuth: () => Promise<void>;
    signup: (data: SignupData) => Promise<void>;
    logout: () => Promise<void>;
    login: (data: LoginData) => Promise<void>;
    updateProfile: (data: UpdateProfileData) => Promise<void>;
    connectSocket: () => void;
    disconnectSocket: () => void;
    
}

export const useAuthStore = create<AuthState>((set, get) => ({
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,

    isCheckingAuth: true,

    onlineUsers: [],
    socket: null,

    checkAuth: async()=>{
        try{
            const res = await axiosInstance.get("/auth/check");

            set({authUser: res.data});
            get().connectSocket();
        } catch(error){
            console.log("Error in checkAuth:", error); 
            set({authUser: null})
        } finally{
            set({isCheckingAuth: false})
        }
    },

    signup: async(data: SignupData)=>{
        set({ isSigningUp: true});
        try{
            const res = await axiosInstance.post("/auth/signup", data);
            set({ authUser: res.data})
            toast.success("Account created successfully");
            get().connectSocket(); 

        }catch(error){
            console.error("Signup Error:", error)
            if(error instanceof AxiosError && error.response){
                toast.error(error.response.data.message);
            } else {
                toast.error("An error occurred. Please try again.");
            }
        } finally {
            set({ isSigningUp: false });
        }
    },

    logout: async()=>{
        try{
            await axiosInstance.post("/auth/logout");
            set({ authUser: null });
            toast.success("Logged out successfully");
            get().disconnectSocket();
        }catch(error){
            if(error instanceof AxiosError && error.response){
                toast.error(error.response.data.message);
            }
        }  
    },

    login: async (data: LoginData) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post("/auth/login", data);
            set({ authUser: res.data });
            toast.success("Login successful!");
            get().connectSocket();
        } catch (error) {
            console.error("Login Error:", error);
            if (error instanceof AxiosError && error.response) {
                toast.error(error.response.data.message);
            } else {
                toast.error("An error occurred. Please try again.");
            }
        } finally {
            set({ isLoggingIn: false });
        }
    },

    
    updateProfile: async (data: UpdateProfileData) => {
        set({ isUpdatingProfile: true });
        try {
            const res = await axiosInstance.put("/auth/update-profile", data);
            set({ authUser: res.data });
            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Update Profile Error:", error);
            if (error instanceof AxiosError && error.response) {
                toast.error(error.response.data.message);
            } else {
                toast.error("An error occurred. Please try again.");
            }
        } finally {
            set({ isUpdatingProfile: false });
        }
    },

    connectSocket: () => {
        const {authUser} = get();
        if(!authUser || get().socket?.connected) return;

        const socket = io(BASE_URL, {
            query: {
                userId: authUser._id,
            },
        });
        socket.connect();

        set({socket: socket});

        socket.on("getOnlineUsers", (userIds) => {
            set({onlineUsers: userIds});
        });
    },

    disconnectSocket: () => {
        if(get().socket?.connected) get().socket?.disconnect();
    },
}));