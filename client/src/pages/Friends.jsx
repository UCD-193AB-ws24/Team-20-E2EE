import React, { useState, useEffect } from 'react';
import { MdSearch, MdPersonRemove } from 'react-icons/md';
import { getFriendList, unfriendUser } from '../api/friends';
import { getAvatar } from '../api/user';
import { useAppContext } from '../components';

export default function Friends({ selectedUser, setSelectedUser }) {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unfriendConfirm, setUnfriendConfirm] = useState(null);
  const { theme } = useAppContext();

  const getToken = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.idToken;
  };

  useEffect(() => {
    const loadFriends = async () => {
      setIsLoading(true);
      try {
        const token = getToken();
        const data = await getFriendList(token);
        
        const friendList = await Promise.all(data.friends.map(async (friend) => {
          try {
            const avatarUrl = await getAvatar(friend.username);
            return {
              ...friend,
              avatar: avatarUrl
            };
          } catch (err) {
            console.error(`Error loading avatar for ${friend.username}:`, err);
            return { ...friend, avatar: null };
          }
        }));
        
        setFriends(friendList || []);
      } catch (err) {
        setError(err.message || 'Failed to load friends');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFriends();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };
  
  const handleUnfriend = async (username) => {
    try {
      const token = getToken();
      await unfriendUser(token, username);
      setFriends(friends.filter(friend => friend.username !== username));
      setUnfriendConfirm(null);
    } catch (err) {
      alert(err.message || 'Failed to unfriend user');
    }
  };

  const filteredFriends = searchTerm.trim() === '' 
    ? friends 
    : friends.filter(friend => friend.username.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div 
      className="flex-1 flex flex-col shadow-lg rounded-lg overflow-hidden p-1"
      style={{backgroundColor: theme.colors.background.secondary}}
    >
      <div className="p-3">
        <h2 className="text-2xl font-bold">Friends</h2>
      </div>
      
      <div className="px-2 pb-2 relative">
        <MdSearch className="absolute left-6 top-4 transform -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search friends..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full h-8 p-1 pl-10 rounded-full focus:outline-none focus:ring-1"
          style={{backgroundColor: theme.colors.background.primary}}
        />
      </div>
      
      {error && (
        <div className="p-3 mb-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center p-5">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"></div>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto p-1">
          {filteredFriends.length === 0 ? (
            <p style={{color: theme.colors.text.muted}} className="p-4">No friends found</p>
          ) : (
            filteredFriends.map((friend, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-4 mb-2 rounded-lg h-[70px]"
                style={{
                  backgroundColor: selectedUser === friend.username || unfriendConfirm === friend.username 
                    ? theme.colors.background.primary 
                    : theme.colors.background.secondary
                }}
              >
                {unfriendConfirm === friend.username ? (
                  <div className="w-full flex justify-center items-center"
                    style={{backgroundColor: theme.colors.background.primary}}  
                  >
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUnfriend(friend.username)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setUnfriendConfirm(null)}
                        className="px-3 py-1 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      className="flex items-center flex-1 cursor-pointer" 
                      onClick={() => {setSelectedUser(friend.username)}}
                    >
                      <div className="flex-1 flex items-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                          <img 
                            src={friend.avatar || 'https://via.placeholder.com/40'} 
                            alt={friend.username.charAt(0).toUpperCase()}
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <h3 className="font-medium">{friend.username}</h3>
                      </div>
                    </div>
                    <button
                      onClick={() => setUnfriendConfirm(friend.username)}
                      className="ml-2 p-2 rounded-full hover:bg-gray-600"
                      title="Unfriend"
                    >
                      <MdPersonRemove size={20} />
                    </button>
                  </>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}