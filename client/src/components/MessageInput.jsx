import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from './AppContext';
import { motion } from "motion/react";

export default function MessageInput({ sendMessage, onTyping, disabled = false }) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { theme } = useAppContext();
  const inputRef = useRef(null);
  const formRef = useRef(null);

  // Focus the input when the component mounts or when disabled state changes
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim() && !isSending) {
      setIsSending(true);
      try {
        await sendMessage(text);
        setText('');
        // Refocus the input after sending
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    // Trigger typing indicator
    if (onTyping && e.target.value.trim()) {
      onTyping();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit} 
      className="p-4 rounded-lg m-4 flex"
      onClick={() => inputRef.current?.focus()}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`flex-1 p-2 rounded-lg focus:outline-none ${disabled ? 'bg-gray-100' : ''}`}
        style={{backgroundColor: theme.colors.background.primary}}
        placeholder={disabled ? "Select a user to chat" : "Type your message..."}
        disabled={disabled || isSending}
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
          disabled={isSending}
        >
          {isSending ? 'Sending...' : 'Send'}
        </motion.button>
    </form>
  );
}