'use client';

import { useDrop } from 'react-dnd';
import { GapTag } from '@/types';

interface CanvasDropZoneProps {
  onDrop: (tag: GapTag, x: number, y: number) => void;
  zoom: number;
  pan: { x: number; y: number };
}

function CanvasDropZone({ onDrop, zoom, pan }: CanvasDropZoneProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'gap-tag',
    drop: (item: { tag: GapTag }, monitor) => {
      const offset = monitor.getClientOffset();
      if (offset && dropRef.current) {
        const rect = dropRef.current.getBoundingClientRect();
        const x = offset.x - rect.left;
        const y = offset.y - rect.top;
        onDrop(item.tag, x, y);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const dropRef = drop as any;

  return (
    <div
      ref={dropRef}
      className="absolute inset-0 pointer-events-auto z-10"
      style={{
        backgroundColor: isOver ? 'rgba(91, 110, 255, 0.05)' : 'transparent',
      }}
    />
  );
}

export default CanvasDropZone;
