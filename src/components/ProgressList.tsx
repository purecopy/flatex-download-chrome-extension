import { useEffect, useRef } from 'react';
import type { DocumentItem } from '../types';
import { errorMessage } from '../lib/errors';
import './ProgressList.css';

type Props = {
  items: DocumentItem[];
};

const STATUS_LABEL: Record<DocumentItem['status'], string> = {
  pending: 'Wartet',
  'fetching-link': 'Link wird abgefragt …',
  downloading: 'Wird heruntergeladen …',
  success: 'Fertig',
  failed: 'Fehler',
};

const STATUS_ICON: Record<DocumentItem['status'], string> = {
  pending: '·',
  'fetching-link': '…',
  downloading: '↓',
  success: '✓',
  failed: '✗',
};

const ACTIVE: DocumentItem['status'][] = ['fetching-link', 'downloading'];

export function ProgressList({ items }: Props) {
  const activeIndex = items.findIndex((item) => ACTIVE.includes(item.status));
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

  return (
    <ul className="ProgressList">
      {items.map((item, index) => (
        <li
          key={item.rowIndex}
          ref={index === activeIndex ? activeRef : null}
          className={`ProgressList-item ProgressList-item--${item.status}`}
        >
          <span className="ProgressList-icon">{STATUS_ICON[item.status]}</span>
          <span className="ProgressList-name" title={item.displayName}>
            {item.displayName}
          </span>
          <span className="ProgressList-status">
            {item.status === 'failed' && item.errorCode ? errorMessage(item.errorCode) : STATUS_LABEL[item.status]}
          </span>
        </li>
      ))}
    </ul>
  );
}
