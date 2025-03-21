import {create} from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { AxiosError } from "axios";
import { useAuthStore } from "./useAuthStore";

interface Message {
    image: string | undefined;
    _id: string;
    id: number;
    content: string;
    senderId: number;
    receiverId: number;
    timestamp: string;
    createdAt: string;
    text: string
}
  
  interface User {
    _id: string;
    id: number;
    name: string;
    fullName: string;
    avatar?: string;
    profilePic?: string;
}
  
  interface ChatState {
    messages: Message[];
    users: User[];
    selectedUser: User | null;
    isUsersLoading: boolean;
    isMessagesLoading: boolean;
    getUsers: () => Promise<void>;
    getMessages: (userId: string) => Promise<void>;
    setSelectedUser: (selectedUser: User | null) => void;
    sendMessage: (message: { text: string; image: string | null }) => Promise<void>;
    subscribeToMessages: () => void; 
    unsubscribeFromMessages: () => void; 
}

export const useChatStore = create<ChatState>((set, get)=>({
    messages: [],
    users: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,

    getUsers: async()=>{
        set({isUsersLoading: true});
        try{
            const res = await axiosInstance.get("/messages/users");
            set({users: res.data});
        } catch(error){
            if (error instanceof AxiosError) {
                toast.error(error.response?.data?.message || "An error occurred");
            } else {
                toast.error("An unexpected error occurred");
            }
        } finally{
            set({isUsersLoading: false});
        }
    },
    getMessages: async(userId: string)=>{
        set({isMessagesLoading: true});
        try{
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({messages: res.data});
        }catch(error){
            if (error instanceof AxiosError) {
                toast.error(error.response?.data?.message || "An error occurred");
            } else {
                toast.error("An unexpected error occurred");
            }
        }finally{
            set({isMessagesLoading: false});
        }
    },

    sendMessage: async(messageData)=>{
        const {selectedUser, messages} = get();
        try{
            const res = await axiosInstance.post(`/messages/send/${selectedUser?._id}`, messageData);
            set ({messages: [...messages, res.data]})
        } catch(error){
            if (error instanceof AxiosError) {
                toast.error(error.response?.data?.message || "An error occurred");
            } else {
                toast.error("An unexpected error occurred");
            }
        }
    },

    subscribeToMessages:() => {
        const {selectedUser}= get()
        if(!selectedUser) return;

        const socket = useAuthStore.getState().socket;

        if (!socket) return;
        
        socket.on("newMessage", (newMessage) => {
            const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
            if(!isMessageSentFromSelectedUser) return;
            set({
                messages: [...get().messages, newMessage],
            });
        });
    },

    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        socket.off("newMessage");
    },

    setSelectedUser: (selectedUser: User | null) => set({ selectedUser }),
}))