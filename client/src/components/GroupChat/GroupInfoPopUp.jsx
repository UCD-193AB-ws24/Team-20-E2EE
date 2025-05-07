import React, { useEffect, useState } from 'react';
import { searchUsername } from '../../api/friends';
import { LoadingAnimation } from '../index'; // adjust this import if needed

export default function GroupInfoPopUp({ group, onClose }) {
  const [memberUsernames, setMemberUsernames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!group) return;
  
    const fetchUsernames = async () => {
      try {
        setLoading(true);
        const usernames = await Promise.all(
          group.members.map(async (uid) => {
            const result = await searchUsername(uid);
            return result.username;
          })
        );
        setMemberUsernames(usernames);
      } catch (err) {
        console.error('Error fetching usernames:', err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchUsernames();
  }, [group]);
  

  if (!group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-30">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
        <div className="flex flex-row justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Group Info</h3>
        {/* <button className="hover:bg-gray-300 cursor-pointer bg-gray-200 px-4 py-2 rounded-lg">Add Members</button> */}
        </div>
        
        <p className="mb-2"><strong>Name:</strong> {group.name}</p>
        <p className="mb-2"><strong>Members:</strong></p>

        {loading ? (
          <div className="flex justify-center py-4">
            <LoadingAnimation size="medium" color="ucd-blue" />
          </div>
        ) : (
          <ul className="list-disc list-inside space-y-1">
            {memberUsernames.map((username, i) => (
              <li key={i}>{username}</li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
