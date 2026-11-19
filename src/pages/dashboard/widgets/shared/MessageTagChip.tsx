import { type MessageTag, tagTextColor } from '@/api/messageTags';
import Chip from '@/components/Chip';

// A tag in its color; a deleted one (kept on its messages) is marked.
function MessageTagChip({ tag }: { tag: MessageTag }) {
  return (
    <Chip
      label={tag.deleted ? `${tag.name} (deleted)` : tag.name}
      title={tag.global ? `${tag.name} (global)` : tag.name}
      style={{ background: tag.color, color: tagTextColor(tag.color) }}
    />
  );
}

export default MessageTagChip;
