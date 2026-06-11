'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import {
  IconFileText, IconCheckCircle, IconClock, IconLink,
  IconPenSquare, IconCalendar, IconSend, IconSparkles,
  IconBook, IconUsers, IconChevronLeft, IconChevronRight,
  PlatformIcon, SkeletonCard,
} from '@/components/Icons';

interface Post {
  id: string;
  groupId?: string;
  content: string;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  scheduledTime: string | null;
  page: { id: string; pageName: string; platform: string; brandName: string };
}

// Group of posts sharing the same groupId (same multi-platform publish batch)
interface PostGroup {
  groupId: string | null;
  posts: Post[];
  // Representative post (first in group) for display
  lead: Post;
}

interface Connection {
  id: string; platform: string; accountName: string;
}

function groupPostsByGroupId(posts: Post[]): PostGroup[] {
  const map = new Map<string, Post[]>();
  const ungrouped: Post[] = [];

  for (const post of posts) {
    if (post.groupId) {
      const arr = map.get(post.groupId) ?? [];
      arr.push(post);
      map.set(post.groupId, arr);
    } else {
      ungrouped.push(post);
    }
  }

  const groups: PostGroup[] = [];
  map.forEach((groupPosts, gid) => {
    groups.push({ groupId: gid, posts: groupPosts, lead: groupPosts[0] });
  });
  ungrouped.forEach(p => groups.push({ groupId: null, posts: [p], lead: p }));
  // Sort by lead post date desc
  groups.sort((a, b) => {
    const ta = new Date(a.lead.scheduledTime || a.lead.createdAt).getTime();
    const tb = new Date(b.lead.scheduledTime || b.lead.createdAt).getTime();
    return tb - ta;
  });
  return groups;
}

export default function DashboardPage() {
  const { selectedBrand } = useBrand();
  const [posts, setPosts] = useState<Post[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [aiInfo, setAiInfo] = useState({ models: 0, docs: 0 });

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayGroups, setSelectedDayGroups] = useState<PostGroup[]>([]);
  const [activeDay, setActiveDay] = useState<number | null>(new Date().getDate());

  const load = useCallback(async () => {
    if (!selectedBrand) return;
    setLoading(true);
    
    try {
      const [p, c, models] = await Promise.all([
        api.getPosts(selectedBrand.id),
        api.getConnections(selectedBrand.id),
        api.getAiConfig(selectedBrand.id).catch(() => null)
      ]);

      setPosts(p);
      setConnections(c);

      let modelCount = 0;
      if (models) {
        if (models.textModel) modelCount++;
        if (models.imageModel) modelCount++;
      }
      setAiInfo({ models: modelCount, docs: 0 });

      const today = new Date();
      const todayPosts = p.filter((post: Post) => {
        const d = new Date(post.scheduledTime || post.createdAt);
        return d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear();
      });
      setSelectedDayGroups(groupPostsByGroupId(todayPosts));

    } catch (err) {
      console.error("Dashboard load error:", err);
      toast("Failed to load dashboard data.", 'error')
    }
    setLoading(false);
  }, [selectedBrand]);

  useEffect(() => { load(); }, [load]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let i = 1; i <= lastDay; i++) days.push(i);
    return days;
  }, [currentDate]);

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    setActiveDay(day);
    const dayPosts = posts.filter((post: Post) => {
      const d = new Date(post.scheduledTime || post.createdAt);
      return d.getDate() === day &&
        d.getMonth() === currentDate.getMonth() &&
        d.getFullYear() === currentDate.getFullYear();
    });
    setSelectedDayGroups(groupPostsByGroupId(dayPosts));
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
    setActiveDay(null);
    setSelectedDayGroups([]);
  };

  // Returns distinct groups (by groupId) for a calendar day cell
  const getGroupsForDay = (day: number): PostGroup[] => {
    const dayPosts = posts.filter((post: Post) => {
      const d = new Date(post.scheduledTime || post.createdAt);
      return d.getDate() === day &&
        d.getMonth() === currentDate.getMonth() &&
        d.getFullYear() === currentDate.getFullYear();
    });
    return groupPostsByGroupId(dayPosts);
  };

  const badgeClass = (s: string) => {
    switch (s) {
      case 'DRAFT': return 'badge badge-draft';
      case 'SCHEDULED': return 'badge badge-scheduled';
      case 'PUBLISHED': return 'badge badge-published';
      case 'FAILED': return 'badge badge-failed';
      default: return 'badge';
    }
  };

  return (
    <AppShell>
      <div style={{ width: '100%', padding: '0 40px', animation: 'fadeIn 0.5s ease-out' }}>
        {loading ? (
          <div style={{ padding: '24px 0' }}>
            <div className="skeleton" style={{ width: 240, height: 40, marginBottom: 32 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
            <div className="skeleton" style={{ width: '100%', height: 500 }} />
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Dashboard</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Overview for {selectedBrand?.name}</p>
              </div>
              <Link href="/create" className="btn btn-primary">
                <IconPenSquare size={18} /> <span>Create Post</span>
              </Link>
            </div>

            {/* Content Calendar */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr', gap: 24, marginBottom: 40 }}>
              {/* Calendar */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <IconCalendar color="var(--accent)" />
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-icon-small" onClick={() => changeMonth(-1)}><IconChevronLeft size={16} /></button>
                    <button className="btn-icon-small" onClick={() => changeMonth(1)}><IconChevronRight size={16} /></button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '8px 0', textTransform: 'uppercase' }}>{d}</div>
                  ))}
                  {daysInMonth.map((day, idx) => {
                    const dayGroups = day ? getGroupsForDay(day) : [];
                    const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                    const isActive = day === activeDay;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleDayClick(day)}
                        style={{
                          height: 100,
                          padding: 8,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          background: isActive ? 'rgba(217, 125, 85, 0.05)' : 'transparent',
                          borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                          cursor: day ? 'pointer' : 'default',
                          transition: 'var(--transition)',
                          opacity: day ? 1 : 0,
                        }}
                        className={day ? 'platform-card-hover' : ''}
                      >
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: isToday ? 'var(--accent)' : 'var(--text-primary)',
                          background: isToday ? 'var(--accent-glow)' : 'transparent',
                          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
                        }}>{day}</span>

                        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {dayGroups.slice(0, 2).map(g => (
                            <div key={g.groupId ?? g.lead.id} style={{
                              fontSize: 10, padding: '2px 6px', borderRadius: 4,
                              background: g.lead.status === 'PUBLISHED' ? 'var(--success-bg)' : 'var(--bg-glass-strong)',
                              color: g.lead.status === 'PUBLISHED' ? 'var(--success)' : 'var(--text-secondary)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              borderLeft: `2px solid ${g.lead.status === 'PUBLISHED' ? 'var(--success)' : 'var(--accent)'}`,
                              display: 'flex', alignItems: 'center', gap: 3
                            }}>
                              {/* Platform icons for grouped posts */}
                              {g.posts.slice(0, 3).map(p => (
                                <PlatformIcon key={p.id} platform={p.page.platform} size={10} />
                              ))}
                              {g.posts.length > 3 && <span>+{g.posts.length - 3}</span>}
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {g.lead.content.substring(0, 12)}
                              </span>
                            </div>
                          ))}
                          {dayGroups.length > 2 && (
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>
                              +{dayGroups.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day Details Sidebar */}
              <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                  {activeDay ? `Activity on ${activeDay} ${currentDate.toLocaleString('default', { month: 'short' })}` : 'Select a day'}
                </h3>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedDayGroups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      <IconClock size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                      <p style={{ fontSize: 13 }}>No activities for this day.</p>
                    </div>
                  ) : (
                    selectedDayGroups.map(g => (
                      <div key={g.groupId ?? g.lead.id} style={{
                        padding: 14, borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-glass)', border: '1px solid var(--border)'
                      }}>
                        {/* Platform badges row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            {g.posts.map(p => (
                              <div key={p.id} title={p.page.pageName} style={{
                                display: 'flex', alignItems: 'center', gap: 4, fontSize: 10,
                                background: 'var(--bg-glass-strong)', padding: '2px 6px',
                                borderRadius: 20, color: 'var(--text-secondary)'
                              }}>
                                <PlatformIcon platform={p.page.platform} size={11} />
                                <span>{p.page.pageName.length > 10 ? p.page.pageName.substring(0, 10) + '…' : p.page.pageName}</span>
                              </div>
                            ))}
                          </div>
                          <span className={badgeClass(g.lead.status)} style={{ fontSize: 9 }}>{g.lead.status}</span>
                        </div>

                        <p style={{ fontSize: 12, lineHeight: 1.5, margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>
                          {g.lead.content.length > 90 ? g.lead.content.substring(0, 90) + '…' : g.lead.content}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {g.lead.scheduledTime ? new Date(g.lead.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Draft'}
                          </span>
                          <Link href={`/posts/${g.lead.id}`} style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                            View {g.posts.length > 1 ? `(${g.posts.length} platforms)` : 'Details'}
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {activeDay && (
                  <Link href="/create" className="btn btn-secondary btn-sm" style={{ marginTop: 16, width: '100%' }}>
                    + Schedule Post for this day
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
