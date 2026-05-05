import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAnnouncements, createAnnouncement, deleteAnnouncement, resolveApiAssetUrl } from '../../lib/api.js';
import RichTextEditor from '../RichTextEditor.jsx';

export function GroupNewsroom({ groupId, canManage }) {
  const queryClient = useQueryClient();
  const [showComposer, setShowComposer] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [form, setForm] = useState({
    title: '',
    category: 'Update',
    summary: '',
    content: '',
    status: 'published'
  });

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['group-announcements', groupId],
    queryFn: () => fetchAnnouncements({ groupId })
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => createAnnouncement({ ...payload, groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-announcements', groupId] });
      setForm({ title: '', category: 'Update', summary: '', content: '', status: 'published' });
      setShowComposer(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-announcements', groupId] });
    }
  });

  const formatArticleDate = (value) => {
    return new Date(value).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading group news...</div>;

  return (
    <div className="group-newsroom-view">
      <div className="group-portal-section-header">
        <h2>
          <span className="material-symbols-outlined">campaign</span>
          Group Newsroom
        </h2>
        {canManage && (
          <button 
            className={`button ${showComposer ? 'secondary' : 'primary'} compact`}
            onClick={() => setShowComposer(!showComposer)}
          >
            <span className="material-symbols-outlined">{showComposer ? 'close' : 'add'}</span>
            {showComposer ? 'Close Editor' : 'Post Update'}
          </button>
        )}
      </div>

      {showComposer && (
        <div className="group-news-composer card">
          <div className="form-grid">
            <label>
              <span>Article Title</span>
              <input 
                name="title" 
                value={form.title} 
                onChange={(e) => setForm({...form, title: e.target.value})} 
                placeholder="Enter title..."
              />
            </label>
            <label>
              <span>Category</span>
              <input 
                name="category" 
                value={form.category} 
                onChange={(e) => setForm({...form, category: e.target.value})} 
                placeholder="e.g. Update, Announcement"
              />
            </label>
            <div className="full">
              <span>Content</span>
              <RichTextEditor 
                value={form.content} 
                onChange={(html) => setForm({...form, content: html})}
                placeholder="Write your group update here..."
              />
            </div>
            <div className="inline-actions">
              <button 
                className="button primary" 
                disabled={saveMutation.isPending || !form.title || !form.content}
                onClick={() => saveMutation.mutate(form)}
              >
                {saveMutation.isPending ? 'Posting...' : 'Post Update'}
              </button>
              <button className="button secondary" onClick={() => setShowComposer(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {data.length === 0 && !showComposer ? (
        <div className="portal-empty-state">
          <span className="material-symbols-outlined">newspaper</span>
          <h3>No Updates Yet</h3>
          <p>This group hasn't posted any news or updates yet. Stay tuned for the latest happenings!</p>
        </div>
      ) : (
        <div className="group-news-list">
          {data.map((item) => (
            <article className="group-news-card" key={item._id}>
              <div className="news-card-header">
                <span className="news-card-badge">{item.category}</span>
                <span className="news-card-date">{formatArticleDate(item.createdAt)}</span>
              </div>
              <h3>{item.title}</h3>
              <div 
                className="news-card-preview" 
                dangerouslySetInnerHTML={{ __html: item.content.slice(0, 200) + (item.content.length > 200 ? '...' : '') }}
              />
              <div className="news-card-actions">
                <button className="button ghost compact" onClick={() => setSelectedArticle(item)}>
                  Read More
                </button>
                {canManage && (
                  <button 
                    className="button ghost compact text-red-500"
                    onClick={() => deleteMutation.mutate(item._id)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedArticle && (
        <div className="member-dialog-backdrop" onClick={() => setSelectedArticle(null)}>
          <div className="member-dialog group-news-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="member-dialog-header">
              <div>
                <span className="news-card-badge">{selectedArticle.category}</span>
                <h2>{selectedArticle.title}</h2>
                <p className="muted">Posted on {formatArticleDate(selectedArticle.createdAt)}</p>
              </div>
              <button className="member-dialog-close" onClick={() => setSelectedArticle(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="news-dialog-content prose" dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />
          </div>
        </div>
      )}
    </div>
  );
}
