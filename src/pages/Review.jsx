import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Search, ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import './Review.css';

const slugify = (text) => {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

function Review() {
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItem, setActiveItem] = useState(null); // the name of the active topic/subtopic
  const [markdownContent, setMarkdownContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('/review-content/topics.json')
      .then(res => res.json())
      .then(data => {
        setCategories(data);
        if (data.length > 0) {
          setExpandedGroups({ [0]: true });
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching topics:', err);
        setIsLoading(false);
      });
  }, []);

  const handleSelectItem = (name, catTitle) => {
    setActiveItem(name);
    setMarkdownContent('Đang tải nội dung...');
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }

    const slug = slugify(name);
    const catSlug = slugify(catTitle);
    fetch(`/review-content/${catSlug}/${slug}.md`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.text();
      })
      .then(text => {
        setMarkdownContent(text);
      })
      .catch(err => {
        console.error('Error fetching markdown:', err);
        setMarkdownContent(`> Nội dung cho **${name}** đang được cập nhật.`);
      });
  };

  const toggleGroup = (index) => {
    setExpandedGroups(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleTopic = (catIndex, topicIndex) => {
    const key = `${catIndex}-${topicIndex}`;
    setExpandedTopics(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const filteredCategories = categories.map(cat => {
    const q = searchQuery.toLowerCase();
    if (!q) return cat;

    const filteredTopics = cat.topics.map(topic => {
      const topicMatch = topic.name.toLowerCase().includes(q) || cat.title.toLowerCase().includes(q);
      const filteredSubs = (topic.subs || []).filter(sub =>
        sub.toLowerCase().includes(q) || topic.name.toLowerCase().includes(q) || cat.title.toLowerCase().includes(q)
      );

      if (topicMatch || filteredSubs.length > 0) {
        return { ...topic, subs: filteredSubs, show: true, forceExpand: filteredSubs.length > 0 };
      }
      return { ...topic, show: false };
    }).filter(t => t.show);

    return { ...cat, topics: filteredTopics };
  }).filter(cat => cat.topics.length > 0);

  return (
    <div className="container shell p-0">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span className="mobile-title">Bản Đồ Phỏng Vấn</span>
      </div>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sb-top">
          <div className="logo">☕ Tổng hợp kiến thức</div>
          <input
            id="search"
            type="text"
            placeholder="Tìm chủ đề…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <nav id="nav">
          {isLoading ? (
            <div style={{ padding: '20px', color: 'var(--muted)', textAlign: 'center' }}>Đang tải...</div>
          ) : (
            filteredCategories.map((cat, ci) => (
              <div key={ci} className={`nav-group ${expandedGroups[ci] || searchQuery ? 'open' : ''}`}>
                <div className="nav-cat" onClick={() => toggleGroup(ci)}>
                  <span className="nav-cat-icon">{cat.icon}</span>
                  <span className="nav-cat-label">{cat.title}</span>
                  <span className="nav-cat-arrow">
                    <ChevronRight size={12} />
                  </span>
                </div>

                <AnimatePresence initial={false}>
                  {(expandedGroups[ci] || searchQuery) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                      className="nav-items"
                    >
                      {cat.topics.map((topic, ti) => {
                        const tKey = `${ci}-${ti}`;
                        const hasSubs = topic.subs && topic.subs.length > 0;
                        const isSubOpen = expandedTopics[tKey] || topic.forceExpand;

                        return (
                          <div key={ti}>
                            <div
                              className={`nav-topic ${hasSubs ? 'has-subs' : ''} ${isSubOpen ? 'sub-open' : ''} ${activeItem === topic.name ? 'active' : ''}`}
                              onClick={() => {
                                handleSelectItem(topic.name, cat.title);
                                if (hasSubs) toggleTopic(ci, ti);
                              }}
                            >
                              {hasSubs && (
                                <span className="nav-tp-arrow">
                                  <ChevronRight size={10} />
                                </span>
                              )}
                              <span className="nav-tp-name">{topic.name}</span>
                            </div>

                            {hasSubs && (
                              <AnimatePresence initial={false}>
                                {isSubOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    style={{ overflow: 'hidden' }}
                                    className="nav-subs"
                                  >
                                    {topic.subs.map((sub, si) => (
                                      <div
                                        key={si}
                                        className={`nav-sub ${activeItem === sub ? 'active' : ''}`}
                                        onClick={() => handleSelectItem(sub, cat.title)}
                                      >
                                        {sub}
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </nav>
      </aside>

      <main className="content" id="content">
        {!activeItem ? (
          <div className="welcome">
            <div className="welcome-icon">☕</div>
            <h2>Tổng Hợp Kiến Thức</h2>
            <p>Chọn chủ đề bất kỳ từ menu bên trái để xem giải thích, ví dụ code và câu hỏi phỏng vấn.</p>
          </div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>
        )}
      </main>
    </div>
  );
}

export default Review;
