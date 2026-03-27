import React from 'react';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import { ContactBlock } from '../../types';

interface Props { block: ContactBlock; }

const ContactBlockView: React.FC<Props> = ({ block }) => {
  const { email, phone, location, website } = block.data;
  const items = [
    { icon: Mail, value: email, href: email ? `mailto:${email}` : undefined },
    { icon: Phone, value: phone, href: phone ? `tel:${phone}` : undefined },
    { icon: MapPin, value: location, href: undefined },
    { icon: Globe, value: website, href: website || undefined },
  ].filter(item => item.value);

  if (items.length === 0) return null;
  return (
    <div className="block-view block-contact-view">
      {items.map((item, i) => (
        <div key={i} className="block-contact-item">
          <item.icon size={16} />
          {item.href ? (
            <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{item.value}</a>
          ) : (
            <span>{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default ContactBlockView;
