import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

import "@fullcalendar/common/main.css";
import "@fullcalendar/daygrid/main.css";
import "./Calendar.css"
import {CalendarEvent} from "../interfaces";

const Calendar: React.FC = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedEventInfo, setSelectedEventInfo] = useState<{
        title: string;
        time: string;
        description?: string;
    } | null>(null);

    function toFullCalendarEvent(e: CalendarEvent): EventInput {
        return {
            id: e.id,
            title: e.title,
            start: e.start instanceof Date ? e.start.toISOString() : e.start,
            end: e.end ? (e.end instanceof Date ? e.end.toISOString() : e.end) : undefined,
            allDay: e.allDay ?? false,
            backgroundColor: e.color,
            borderColor: e.color,
            display: "block",
            extendedProps: {
                description: e.description,
            },
        };
    }

    useEffect(() => {
        const sampleEvents: CalendarEvent[] = [
            {
                id: "1",
                title: "팀 미팅",
                start: new Date("2025-08-21T10:00:00"),
                end: new Date("2025-08-21T11:00:00"),
                color: "#3788d8",
                allDay: false,
                description: "주간 업무 점검",
            },
            {
                id: "2",
                title: "점심 약속",
                start: new Date("2025-08-22T12:30:00"),
                end: new Date("2025-08-22T13:30:00"),
                color: "#e74c3c",
                allDay: false,
                description: "OO식당",
            },
            {
                id: "3",
                title: "휴가",
                start: new Date("2025-08-23"),
                end: new Date("2025-08-25"),
                color: "#2ecc71",
                allDay: true,
                description: "여행",
            },
        ];

        setEvents(sampleEvents);
    }, []);

    return (
        <div style={{padding: "30px 20px 0 20px"}}>
            <FullCalendar events={events.map(toFullCalendarEvent)}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                    left: "prev",
                    center: "title",
                    right: "next"
                }}
                buttonIcons={{
                    prev: "chevron-left",
                    next: "chevron-right"
                }}
                themeSystem="standard"
                locale="ko"
                contentHeight="auto"
                expandRows={true}
                eventDidMount={(info) => {
                    const el = info.el;
                    const { start, end, extendedProps, allDay, title } = info.event;
                    const formatTime = (date: Date | null) => {
                        if (!date) return "";
                        return date.toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                        });
                    };

                    let tooltipText = "";
                    if (!allDay) {
                        const startTime = formatTime(start);
                        const endTime = formatTime(end);
                        if (startTime && endTime) tooltipText = `${startTime} ~ ${endTime}`;
                        else if (startTime) tooltipText = startTime;
                        else if (endTime) tooltipText = `~ ${endTime}`;
                    }
                    tooltipText = extendedProps.description
                        ? (tooltipText ? `${tooltipText} : ${extendedProps.description}` : extendedProps.description)
                        : (tooltipText ? `${tooltipText} : ${title}` : title);

                    // hover용 (데스크톱)
                    const handleMouseEnter = () => {
                        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                            const existingTooltip = document.querySelector('.fc-custom-tooltip');
                            if (existingTooltip) existingTooltip.remove();

                            const tooltip = document.createElement('div');
                            tooltip.className = 'fc-custom-tooltip';
                            tooltip.innerText = tooltipText;
                            document.body.appendChild(tooltip);

                            const calendar = el.closest(".fc") as HTMLElement;
                            if (!calendar) return;

                            const calRect = calendar.getBoundingClientRect();
                            const elRect = el.getBoundingClientRect();
                            const tipRect = tooltip.getBoundingClientRect();
                            const margin = 4;

                            let top = elRect.top - tipRect.height - 4;
                            let left = elRect.left + (elRect.width / 2) - (tipRect.width / 2);

                            if (left < calRect.left) left = calRect.left + margin;
                            if (left + tipRect.width > calRect.right) {
                                left = calRect.right - tipRect.width - margin;
                            }

                            tooltip.style.left = `${left}px`;
                            tooltip.style.top = `${top}px`;
                            tooltip.style.opacity = '1';
                        }
                    };
                    const handleMouseLeave = () => {
                        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                            const tooltip = document.querySelector('.fc-custom-tooltip');
                            if (tooltip) tooltip.remove();
                        }
                    };

                    // 모바일 전용 모달
                    const handleClick = () => {
                    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
                        setSelectedEventInfo({
                            title,
                            time: tooltipText,
                            description: extendedProps.description,
                        });
                    }
                };

                    el.addEventListener("mouseenter", handleMouseEnter);
                    el.addEventListener("mouseleave", handleMouseLeave);
                    el.addEventListener("click", handleClick);

                    info.event.setExtendedProp("_listeners", { handleMouseEnter, handleMouseLeave, handleClick });
                }}
                eventWillUnmount={(info) => {
                    const { el, event } = info;
                    const listeners = event.extendedProps._listeners;
                    if (listeners) {
                        el.removeEventListener("mouseenter", listeners.handleMouseEnter);
                        el.removeEventListener("mouseleave", listeners.handleMouseLeave);
                        el.removeEventListener("click", listeners.handleClick);
                    }
                }}
                eventContent={(arg) => {
                    // 각 입력 시간 케이스별 보여지는 값 조정

                    const {start, end, extendedProps, title} = arg.event;

                    const formatTime = (date: Date | null) => {
                        if (!date) return "";
                        return date.toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                        });
                    };

                    const startTime = formatTime(start);
                    const endTime = formatTime(end);
                    const description = extendedProps.description;

                    let tooltipText = "";

                    if (startTime && endTime) {
                        tooltipText = `${startTime} - ${endTime}`;
                    } else if (startTime && !endTime) {
                        tooltipText = `${startTime}`;
                    } else if (!startTime && endTime) {
                        tooltipText = `~ ${endTime}`;
                    }

                    if (description) {
                        tooltipText = tooltipText ? `${tooltipText} : ${description}` : description;
                    }

                    return (
                        <div className="fc-custom-event" data-tooltip={tooltipText}>
                            <b>{title}</b>
                        </div>
                    );
                }}
            />
            {selectedEventInfo && (
                <div className="mobile-event-modal">
                    <div className="modal-content">
                        <h3>{selectedEventInfo.title}</h3>
                        <p>{selectedEventInfo.time}</p>
                        {selectedEventInfo.description && <p>{selectedEventInfo.description}</p>}
                        <button onClick={() => setSelectedEventInfo(null)}>닫기</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
