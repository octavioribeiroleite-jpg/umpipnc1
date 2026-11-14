import { Fragment } from 'react';

function formatInline(text: string) {
  return text.split(/(\*[^*\n]+\*|_[^_\n]+_)/g).map((part, index) => {
    if (index % 2 === 0) return part;
    const content = part.slice(1, -1);
    return part[0] === '*'
      ? <strong key={index}>{content}</strong>
      : <em key={index}>{content}</em>;
  });
}

export function StudyWhatsAppPreview({ message }: { message: string }) {
  return (
    <article aria-label="Prévia da mensagem" className="space-y-4 rounded-2xl border border-border border-l-[3px] border-l-primary bg-card p-4 text-base leading-relaxed [overflow-wrap:anywhere] sm:p-5">
      {message.split(/\n{2,}/).map((block, index) => (
        <p key={index}>
          {block.split('\n').map((line, lineIndex) => (
            <Fragment key={lineIndex}>
              {lineIndex > 0 && <br />}
              {formatInline(line)}
            </Fragment>
          ))}
        </p>
      ))}
    </article>
  );
}
