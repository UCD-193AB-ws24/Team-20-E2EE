import React, { useState, useEffect } from 'react';
import axios from "axios";
import Sidebar from '../components/Sidebar';
import ChatList from '../components/ChatList'; 
import ChatWindow from '../components/ChatWindow';
import MessageInput from '../components/MessageInput';
import {BACKEND_URL} from '../config/config';

const mockMessages = {
  Alice: {
    messages: [
      { sender: 'Alice', text: 'Hey! How are you?', time: '10:00 AM' },
      { sender: 'Me', text: 'I am good! How about you?', time: '10:02 AM' },
    ],
    mostRecentMessage: 'I am good! How about you?',
  },
  Bob: {
    messages: [
      { sender: 'Bob', text: 'Want to grab lunch?', time: '12:30 PM' },
      { sender: 'Me', text: 'Sure, what time?', time: '12:35 PM' },
    ],
    mostRecentMessage: 'Sure, what time?',
  },
  Charlie: {
    messages: [
      { sender: 'Charlie', text: 'Let’s catch up soon!', time: '5:45 PM' },
      { sender: 'Me', text: 'Absolutely! Let me know when.', time: '5:47 PM' },
    ],
    mostRecentMessage: 'Absolutely! Let me know when.',
  },
};

export default function Home() {
  const [selectedUser, setSelectedUser] = useState('Alice');
  const [messages, setMessages] = useState(mockMessages[selectedUser].messages);

  useEffect(() => {
    setMessages(mockMessages[selectedUser].messages || []);
  }, [selectedUser]);

  const sendMessage = async (text) => {
    const newMessage = { sender: 'Me', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    
    // try {
    //   const response = await axios.post("http://localhost:5000", {
    //     message: text,
    //   });

    //   console.log("Server Response:", response.data); // Debugging log

    //   setMessages((prev) => [...prev, newMessage]);
    // } catch (error) {
    //   console.error("Error sending message:", error);
    // }
    
    setMessages((prev) => [...prev, newMessage]);
    
    const response = await fetch(`${BACKEND_URL}/api/message/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: newMessage }),
    });

    const data = await response.json();
    console.log(data.message);
  };

  const recentMessages = Object.fromEntries(
    Object.entries(mockMessages).map(([user, { mostRecentMessage }]) => [user, mostRecentMessage])
  );

  return (
    <div className="h-screen flex bg-ucd-blue-light">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Chat List (List of Conversations) */}
      <ChatList users={Object.keys(mockMessages)} selectedUser={selectedUser} setSelectedUser={setSelectedUser} recentMessages={recentMessages} />

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-white shadow-lg rounded-lg m-4">
        <div className="p-4">
          <h2 className="text-xl font-bold text-ucd-blue-900">{selectedUser}</h2>
        </div>
        <ChatWindow messages={messages} />
        <MessageInput sendMessage={sendMessage} />
      </div>
    </div>
  );
}