import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { liveUpdatesAPI } from '../services/api';
import './LiveUpdatesTicker.css';

const donationFacts = [
  {
    icon: '🩸',
    title: 'Every donation matters',
    message: 'Your donation may help patients who need blood.',
    link: '/donor/profile',
    linkLabel: 'Donor profile',
  },
  {
    icon: '💡',
    title: 'Ready to donate?',
    message: 'Review your donor profile and donation history.',
    link: '/donor/profile',
    linkLabel: 'View profile',
  },
  {
    icon: '📍',
    title: 'Find a nearby camp',
    message: 'Browse upcoming camps and check their location details.',
    link: '/camps',
    linkLabel: 'Browse camps',
  },
  {
    icon: '🗓️',
    title: 'Plan ahead',
    message: 'Check the camp date and venue before you travel.',
    link: '/camps',
    linkLabel: 'See camp dates',
  },
  {
    icon: '🤝',
    title: 'Invite a friend',
    message: 'Share a camp with someone who may want to donate.',
    link: '/camps',
    linkLabel: 'Explore camps',
  },
];

const faqs = [
  {
    question: 'How do I join a camp?',
    answer: 'Open Camps, choose an upcoming camp, then register from its details.',
  },
  {
    question: 'How can I check donation eligibility?',
    answer: 'Create or open your donor profile to review your current eligibility.',
  },
  {
    question: 'How do I create a camp?',
    answer: 'Organizers and admins can create one from the Dashboard quick actions.',
  },
  {
    question: 'Where can I find a camp location?',
    answer: 'Open a camp to view its address and map. A camp QR code also opens its public details.',
  },
  {
    question: 'How do I update my donor information?',
    answer: 'Open your Donor Profile to review or update the information available to your account.',
  },
  {
    question: 'How can I learn about blood donation eligibility?',
    answer: 'Eligibility depends on your health and local guidelines. Check with the camp medical team or a healthcare professional.',
  },
  {
    question: 'What if I need blood for a patient?',
    answer: 'Create a blood request with accurate details, then follow its status from the Requests page.',
  },
  {
    question: 'Where can I get help with my account?',
    answer: 'Use the app navigation to open your profile, or contact the administrator of your SaveLife service.',
  },
];

const LiveUpdatesTicker = () => {
  const { isAuthenticated } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);

  const fetchLiveUpdates = useCallback(async () => {
    try {
      const response = await liveUpdatesAPI.get();
      setUpdates(Array.isArray(response.data.data) ? response.data.data : []);
      setError('');
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Live camp updates are temporarily unavailable.'
      );
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    document.body.classList.add('has-live-updates');
    fetchLiveUpdates();
    const refreshId = window.setInterval(fetchLiveUpdates, 30000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchLiveUpdates();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(refreshId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      document.body.classList.remove('has-live-updates');
    };
  }, [fetchLiveUpdates, isAuthenticated]);

  const announcements = useMemo(() => {
    return [...updates, ...donationFacts];
  }, [updates]);

  if (!isAuthenticated) return null;
  const headlineItems = announcements.length
    ? announcements
    : donationFacts;

  return (
    <aside
      className={`live-updates${isExpanded ? ' live-updates-expanded' : ''}`}
      aria-label="SaveLife live updates"
    >
      {isFaqOpen && (
        <section
          className="live-updates-faq"
          aria-label="Frequently asked questions"
          id="live-updates-help"
        >
          <div className="live-updates-faq-heading">
            <div>
              <span className="live-updates-eyebrow">HELP CENTER</span>
              <h2>Frequently asked questions</h2>
            </div>
            <button
              type="button"
              className="live-updates-icon-button"
              aria-label="Close frequently asked questions"
              onClick={() => setIsFaqOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="live-updates-faq-list">
            {faqs.map((faq) => (
              <details key={faq.question} className="live-updates-faq-item">
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <div className="live-updates-bar">
        <div className="live-updates-brand">
          <span className="live-updates-pulse" aria-hidden="true" />
          <span>SaveLife</span>
          <span className="live-updates-label">LIVE</span>
        </div>

        {!isExpanded && (
          <div
            className="live-updates-marquee"
            aria-label="Live camps, donor tips, and announcements"
            tabIndex="0"
          >
            <div className="live-updates-track">
              <div className="live-updates-group">
                {headlineItems.map((item, index) => (
                  <Link
                    className="live-updates-headline"
                    to={item.link}
                    key={`${item.title}-${index}`}
                    aria-label={`${item.title}: ${item.message}${item.detail ? `, ${item.detail}` : ''}`}
                  >
                    <span className="live-updates-icon" aria-hidden="true">{item.icon}</span>
                    <span className="live-updates-copy">
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                      {item.detail && <small>{item.detail}</small>}
                    </span>
                    <span className="live-updates-action">{item.linkLabel} <span aria-hidden="true">→</span></span>
                  </Link>
                ))}
              </div>
              <div className="live-updates-group" aria-hidden="true">
                {headlineItems.map((item, index) => (
                  <div className="live-updates-headline" key={`${item.title}-repeat-${index}`}>
                    <span className="live-updates-icon" aria-hidden="true">{item.icon}</span>
                    <span className="live-updates-copy">
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                      {item.detail && <small>{item.detail}</small>}
                    </span>
                    <span className="live-updates-action">{item.linkLabel} <span aria-hidden="true">→</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && !isExpanded && (
          <span className="live-updates-error" role="status">{error}</span>
        )}

        {isExpanded && (
          <div className="live-updates-expanded-copy">
            <span>
              {updates.filter((update) => update.kind === 'camp').length} upcoming camps
              {' · '}{updates.filter((update) => update.kind === 'request').length} fulfilled requests
              {' · '}{updates.filter((update) => update.kind === 'donation').length} recent donations
              {' · Donor tips · Help'}
            </span>
          </div>
        )}

        <div className="live-updates-controls">
          <button
            type="button"
            className={`live-updates-icon-button${isFaqOpen ? ' is-active' : ''}`}
            aria-label={isFaqOpen ? 'Close frequently asked questions' : 'Open frequently asked questions'}
            aria-expanded={isFaqOpen}
            aria-controls="live-updates-help"
            onClick={() => setIsFaqOpen((open) => !open)}
          >
            ?
          </button>
          <button
            type="button"
            className="live-updates-icon-button"
            aria-label={isExpanded ? 'Show live update' : 'Minimize live updates'}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((expanded) => !expanded)}
          >
            {isExpanded ? '⌄' : '−'}
          </button>
        </div>
      </div>

      {!isExpanded && <div className="live-updates-progress" aria-hidden="true" />}
    </aside>
  );
};

export default LiveUpdatesTicker;
