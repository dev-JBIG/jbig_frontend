import React from "react";

const CalendarPage: React.FC = () => {
  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <iframe
        src="https://calendar.google.com/calendar/embed?src=f8f636e48d4d33a2e191f9967e470341cb18aa5c57f12d015a660a751fddef10%40group.calendar.google.com&ctz=Asia%2FSeoul"
        style={{ border: 0 }}
        width={800}
        height={600}
        frameBorder={0}
        scrolling="no"
        title="대회 캘린더"
      />
    </div>
  );
};

export default CalendarPage;
