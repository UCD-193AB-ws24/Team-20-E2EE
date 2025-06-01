import React, { useState, useEffect } from "react";
import { MdSearch } from "react-icons/md";
import { getFriendList } from "../api/friends";
import {
  createGroupChat,
  getAllGroupChat,
} from "../api/messages";
import {
  registerUserOnlineListener,
  registerUserOfflineListener,
  registerInitialStatusListener,
  registerGroupMemberAddedListener,
  registerAddedToGroupListener,
  registerNewGroupCreatedListener,
  registerGroupMemberRemovedListener,
  requestInitialStatus,
  removeListener,
} from "../api/socket";
import { getAvatar } from "../api/user";
import { LoadingAnimation, useSocket, useAppContext } from "./index";
import { motion } from "motion/react";
import GroupCreationPopUp from "./GroupChat/GroupCreationPopUp";
import GroupInfoPopUp from "./GroupChat/GroupInfoPopUp";
import SettingsIcon from "@mui/icons-material/Settings";

export default function ChatList({ selectedUser, setSelectedUser }) {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  const { socketReady } = useSocket();
  const { theme } = useAppContext();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupChats, setGroupChats] = useState([]);
  const [selectedGroupInfo, setSelectedGroupInfo] = useState(null);
  const [hoveredFriend, setHoveredFriend] = useState(null);

  const loadGroupChats = async () => {
    try {
      const groups = await getAllGroupChat();
      setGroupChats(groups && Array.isArray(groups) ? groups : []);
    } catch (err) {
      console.error("Error loading group chats:", err);
    }
  };

  useEffect(() => {
    loadGroupChats();
  }, []);

  useEffect(() => {
    const loadFriends = async () => {
      setIsLoading(true);
      try {
        const data = await getFriendList();
        const friendsWithAvatars = await Promise.all(
          (data.friends || []).map(async (friend) => {
            try {
              const avatar = await getAvatar(friend.username);
              return { ...friend, avatar };
            } catch {
              return friend;
            }
          })
        );
        setFriends(friendsWithAvatars);
      } catch (err) {
        console.error("Error loading friends:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadFriends();
  }, []);

  useEffect(() => {
    if (!socketReady) return;

    registerUserOnlineListener(({ username }) => {
      if (username) setOnlineUsers((prev) => ({ ...prev, [username]: true }));
    });

    registerUserOfflineListener(({ username }) => {
      if (username) setOnlineUsers((prev) => ({ ...prev, [username]: false }));
    });

    registerInitialStatusListener(({ friends }) => {
      const newState = {};
      friends?.forEach(({ username, online }) => {
        if (username) newState[username] = online;
      });
      setOnlineUsers(newState);
    });

    const removeGroupMemberAddedListener = registerGroupMemberAddedListener((data) => {
      console.log('Group member added:', data);
      const { groupId, newMember, updatedGroup } = data;
      
      // Update the specific group in the groupChats state
      setGroupChats(prevGroups => 
        prevGroups.map(group => 
          group._id === groupId 
            ? { ...group, members: updatedGroup.members }
            : group
        )
      );
      
      // Show notification
      console.log(`${newMember.username} was added to ${data.groupName}`);
    });

    const removeAddedToGroupListener = registerAddedToGroupListener((data) => {
      console.log('Added to new group:', data);
      const { group } = data;
      
      // Add the new group to groupChats
      setGroupChats(prevGroups => {
        // Check if group already exists to avoid duplicates
        const groupExists = prevGroups.some(g => g._id === group._id);
        if (groupExists) {
          return prevGroups.map(g => g._id === group._id ? group : g);
        }
        return [...prevGroups, group];
      });
      
      // Show notification
      console.log(`You were added to group: ${group.name}`);
    });

    const removeNewGroupCreatedListener = registerNewGroupCreatedListener((data) => {
      console.log('New group created:', data);
      const { group, createdBy } = data;
      
      // Add the new group to groupChats
      setGroupChats(prevGroups => {
        const groupExists = prevGroups.some(g => g._id === group._id);
        if (groupExists) return prevGroups;
        return [...prevGroups, group];
      });
      
      // Show notification
      console.log(`${createdBy.username} created a new group: ${group.name}`);
    });

    const removeGroupMemberRemovedListener = registerGroupMemberRemovedListener((data) => {
      console.log('Group member removed:', data);
      const { groupId, removedMember, updatedGroup } = data;
      
      if (removedMember.uid === getCurrentUser().uid) {
        // Current user was removed from group - remove group from list
        setGroupChats(prevGroups => 
          prevGroups.filter(group => group._id !== groupId)
        );
        
        // If this group was selected, deselect it
        if (typeof selectedUser === 'object' && selectedUser.id === groupId) {
          setSelectedUser(null);
        }
      } else {
        // Another member was removed - update group members
        setGroupChats(prevGroups => 
          prevGroups.map(group => 
            group._id === groupId 
              ? { ...group, members: updatedGroup.members }
              : group
          )
        );
      }
    });

    requestInitialStatus();

    return () => {
      removeListener("user_online");
      removeListener("user_offline");
      removeListener("initial_status");
      removeGroupMemberAddedListener();
      removeAddedToGroupListener();
      removeNewGroupCreatedListener();
      removeGroupMemberRemovedListener();
    };
  }, [socketReady, selectedUser]);

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div
        className="flex-1 flex flex-col shadow-lg rounded-lg p-1 overflow-hidden"
        style={{ backgroundColor: theme.colors.background.secondary }}
      >
        <div className="flex flex-row justify-between p-3">
          <h2 className="text-2xl font-bold text-ucd-blue-900">Chats</h2>
          <button
            className="text-xl text-ucd-blue-900 cursor-pointer hover:text-blue-700"
            onClick={() => setShowGroupModal(true)}
          >
            Create a Group
          </button>
        </div>

        <div className="px-2 pb-2 relative">
          <MdSearch className="absolute left-6 top-4 transform -translate-y-1/2 text-ucd-blue-600" />
          <input
            type="text"
            placeholder="Search for a user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 p-1 pl-10 rounded-full focus:outline-none focus:ring-1"
            style={{ backgroundColor: theme.colors.background.primary }}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center p-5">
            <LoadingAnimation size="medium" color="ucd-blue" />
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto p-1">
            {filteredFriends.length > 0 && (
              <>
                <h2 className="text-xl font-semibold text-ucd-blue-900 mt-4">
                  Private Messages
                </h2>
                {filteredFriends.map((friend) => (
                  <motion.li
                    key={friend.username}
                    className="flex items-center p-4 mb-2 rounded-lg h-[70px]"
                    animate={{
                      backgroundColor:
                        selectedUser === friend.username
                          ? theme.colors.background.primary
                          : theme.colors.background.secondary,
                    }}
                    whileHover={{
                      backgroundColor: theme.colors.background.primary,
                    }}
                    whileTap={{
                      backgroundColor: theme.colors.background.secondary,
                    }}
                    onMouseEnter={() => setHoveredFriend(friend.username)}
                    onMouseLeave={() => setHoveredFriend(null)}
                    onClick={() => setSelectedUser(friend.username)}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gray-200 cursor-pointer">
                        {friend.avatar ? (
                          <img
                            src={friend.avatar}
                            alt={friend.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          friend.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      {onlineUsers[friend.username] && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center flex-1 ml-4 overflow-hidden cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold truncate">
                          {friend.username}
                        </span>
                      </div>
                      {/* Show description on hover */}
                      <div className="hidden md:block">
                        {hoveredFriend === friend.username && (
                          <p className="text-sm text-gray-400">
                            Status: {friend.description ? friend.description : "nothing on my mind..."}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.li>
                ))}
              </>
            )}

            {groupChats.length > 0 && (
              <>
                <hr className="my-4" />
                <h2 className="text-xl font-semibold text-ucd-blue-900 mt-4">
                  Groups
                </h2>
                {groupChats.map((group) => (
                  <motion.li
                    key={group.id || group.name}
                    className="flex items-center p-4 mb-2 rounded-lg h-[70px]"
                    animate={{
                      backgroundColor:
                        selectedUser === group.name
                          ? theme.colors.background.primary
                          : theme.colors.background.secondary,
                    }}
                    whileHover={{
                      backgroundColor: theme.colors.background.primary,
                    }}
                    whileTap={{
                      backgroundColor: theme.colors.background.secondary,
                    }}
                    onClick={() =>
                      setSelectedUser({
                        type: "group",
                        id: group._id,
                        name: group.name,
                        members: group.members,
                      })
                    }
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer">
                      {group.avatar ? (
                        <img
                          src={group.avatar}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src="/images/default-group-avatar.jpg"
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex flex-row justify-between flex-1 overflow-hidden ml-4 cursor-pointer">
                      <span className="font-semibold truncate">
                        {group.name}
                      </span>
                      <button
                        className="text-gray-600 hover:text-blue-700 hover:brightness-150 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGroupInfo(group);
                        }}
                      >
                        <SettingsIcon />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </>
            )}
          </ul>
        )}
      </div>

      {showGroupModal && (
        <GroupCreationPopUp
          friends={friends}
          onClose={() => setShowGroupModal(false)}
          onCreate={async (groupData) => {
            const response = await createGroupChat(
              groupData.name,
              groupData.members
            );
            await loadGroupChats();
            setShowGroupModal(false);
          }}
        />
      )}

      {selectedGroupInfo && (
        <GroupInfoPopUp
          group={selectedGroupInfo}
          onClose={() => {
            setSelectedGroupInfo(null);
            loadGroupChats();
          }}
          setSelectedUser={setSelectedUser}
        />
      )}
    </>
  );
}