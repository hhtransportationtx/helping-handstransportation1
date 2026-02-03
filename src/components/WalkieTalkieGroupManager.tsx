import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Users, Trash2, Edit, UserPlus, X } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string;
  color: string;
  is_private: boolean;
  member_count?: number;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    role: string;
  };
}

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export default function WalkieTalkieGroupManager() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: PRESET_COLORS[0],
    is_private: false
  });

  const isAdmin = profile?.role === 'admin' || profile?.role === 'dispatcher' || profile?.role === 'super_admin';

  useEffect(() => {
    if (profile?.company_id) {
      loadGroups();
      loadAllUsers();
    }
  }, [profile?.company_id]);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('walkie_talkie_groups')
        .select(`
          *,
          walkie_talkie_group_members(count)
        `)
        .eq('company_id', profile?.company_id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const groupsWithCount = data?.map(g => ({
        ...g,
        member_count: g.walkie_talkie_group_members?.[0]?.count || 0
      })) || [];

      setGroups(groupsWithCount);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('company_id', profile?.company_id)
        .order('full_name');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('walkie_talkie_group_members')
        .select(`
          *,
          profiles:user_id (
            full_name,
            role
          )
        `)
        .eq('group_id', groupId);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;

    try {
      const { data: newGroup, error } = await supabase
        .from('walkie_talkie_groups')
        .insert({
          company_id: profile.company_id,
          created_by: profile.id,
          ...formData
        })
        .select()
        .single();

      if (error) throw error;

      setGroups([...groups, { ...newGroup, member_count: 0 }]);
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        is_private: false
      });
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('walkie_talkie_groups')
        .update({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          is_private: formData.is_private,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedGroup.id);

      if (error) throw error;

      loadGroups();
      setShowEditModal(false);
      setSelectedGroup(null);
    } catch (error) {
      console.error('Error updating group:', error);
      alert('Failed to update group');
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
      const { error } = await supabase
        .from('walkie_talkie_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('walkie_talkie_group_members')
        .insert({
          group_id: selectedGroup.id,
          user_id: userId,
          role: 'member'
        });

      if (error) throw error;
      loadMembers(selectedGroup.id);
      loadGroups();
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('walkie_talkie_group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      if (selectedGroup) {
        loadMembers(selectedGroup.id);
      }
      loadGroups();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const openEditModal = (group: Group) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color,
      is_private: group.is_private
    });
    setShowEditModal(true);
  };

  const openMembersModal = (group: Group) => {
    setSelectedGroup(group);
    loadMembers(group.id);
    setShowMembersModal(true);
  };

  if (loading) {
    return <div className="text-center py-8">Loading groups...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Walkie Talkie Groups</h2>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Group
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="bg-white rounded-lg shadow p-4 border-l-4"
            style={{ borderLeftColor: group.color }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(group)}
                    className="p-1 text-gray-500 hover:text-blue-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="p-1 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{group.member_count} members</span>
                {group.is_private && (
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                    Private
                  </span>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => openMembersModal(group)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <UserPlus className="w-4 h-4" />
                  Manage
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Create New Group</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_private}
                  onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Private Group</span>
              </label>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Edit Group</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_private}
                  onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Private Group</span>
              </label>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Manage Members: {selectedGroup.name}
              </h3>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Add Members</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {allUsers
                  .filter((user) => !members.find((m) => m.user_id === user.id))
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                    >
                      <div>
                        <div className="font-medium text-sm">{user.full_name}</div>
                        <div className="text-xs text-gray-500">{user.role}</div>
                      </div>
                      <button
                        onClick={() => handleAddMember(user.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Members</h4>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{member.profiles.full_name}</div>
                      <div className="text-sm text-gray-600">
                        {member.profiles.role} • {member.role}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
