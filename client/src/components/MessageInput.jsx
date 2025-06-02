import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from './AppContext';
import { motion } from "motion/react";

export default function MessageInput({ sendMessage, onTyping, disabled = false, placeholder }) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { theme } = useAppContext();
  const inputRef = useRef(null);
  const formRef = useRef(null);

  // Focus the input when the component mounts or when disabled state changes
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (disabled || !message.trim()) return;

    try {
      await sendMessage(message);
      setMessage("");
      // Refocus the input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } catch (error) {
      console.error('Error sending message:', error);
    } 
  };

  const handleChange = (e) => {
    if (disabled) return;

    setMessage(e.target.value);

    // Trigger typing indicator
    if (onTyping && !isTyping) {
      onTyping(true);
      setIsTyping(true);
    }
  };

  const handleKeyPress = (e) => {
    if (disabled) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const defaultPlaceholder = disabled 
    ? "You cannot send messages to this conversation" 
    : "Type a message...";

  return (
    <form 
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        handleSendMessage();
      }} 
      className="p-4 rounded-lg m-4 flex"
      onClick={() => inputRef.current?.focus()}
    >
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        className={`flex-1 p-2 rounded-lg focus:outline-none ${disabled ? 'bg-gray-100' : ''}`}
        style={{backgroundColor: theme.colors.background.primary}}
        placeholder={placeholder || defaultPlaceholder}
        disabled={disabled}
      />
        <motion.button 
          type="submit" 
          className={'ml-2 p-2 rounded-lg'}
          style={{
            backgroundColor: theme.colors.button.primary,
            color: theme.type === 'light' ? '#000000' : '#FFFFFF',
            fontWeight: theme.type === 'light' ? '500' : '400',
            display: disabled ? 'none' : 'block'
          }}
          whileHover={{
            backgroundColor: theme.colors.button.primaryHover,
          }}
          disabled={disabled}
        >
          {disabled ? 'Disabled' : 'Send'}
        </motion.button>
    </form>
  );
}