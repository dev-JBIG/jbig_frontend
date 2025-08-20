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

                    const {start, end, extendedProps, allDay, title} = info.event;

                    const formatTime = (date: Date | null) => {
                        if (!date) return "";
                        return date.toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                        });
                    };

                    let tooltipText = "";
                    const description = extendedProps.description;

                    // 하루 종일 일정이 아닐 때만 시간 정보를 툴팁에 추가합니다.
                    if (!allDay) {
                        const startTime = formatTime(start);
                        const endTime = formatTime(end);

                        if (startTime && endTime) {
                            tooltipText = `${startTime} ~ ${endTime}`;
                        } else if (startTime) {
                            tooltipText = startTime;
                        } else if (endTime) {
                            tooltipText = `~ ${endTime}`;
                        }
                    }

                    // 설명이 있다면 툴팁에 추가하고, 없다면 제목을 대신 추가합니다.
                    if (description) {
                        tooltipText = tooltipText ? `${tooltipText} : ${description}` : description;
                    } else {
                        tooltipText = tooltipText ? `${tooltipText} : ${title}` : title;
                    }

                    // 마우스를 올렸을 때 툴팁 생성 및 위치 계산
                    const handleMouseEnter = () => {
                        // 기존 툴팁이 있다면 제거
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

                        // 툴팁의 기본 위치 계산 (이벤트 요소 위 중앙)
                        let top = elRect.top - tipRect.height - 4;
                        let left = elRect.left + (elRect.width / 2) - (tipRect.width / 2);

                        // 달력 왼쪽 경계를 벗어나는지 확인하고 보정
                        if (left < calRect.left) {
                            left = calRect.left + margin;
                        }
                        // 달력 오른쪽 경계를 벗어나는지 확인하고 보정
                        if (left + tipRect.width > calRect.right) {
                            left = calRect.right - tipRect.width - margin;
                        }

                        tooltip.style.left = `${left}px`;
                        tooltip.style.top = `${top}px`;
                        tooltip.style.opacity = '1';
                    };

                    // 마우스가 벗어났을 때 툴팁 제거
                    const handleMouseLeave = () => {
                        const tooltip = document.querySelector('.fc-custom-tooltip');
                        if (tooltip) {
                            tooltip.remove();
                        }
                    };

                    el.addEventListener('mouseenter', handleMouseEnter);
                    el.addEventListener('mouseleave', handleMouseLeave);

                    // 컴포넌트 언마운트 시 이벤트 리스너 정리
                    info.event.setExtendedProp('_listeners', {handleMouseEnter, handleMouseLeave});
                }}
                eventWillUnmount={(info) => {
                    const {el, event} = info;
                    const listeners = event.extendedProps._listeners;
                    if (listeners) {
                        el.removeEventListener('mouseenter', listeners.handleMouseEnter);
                        el.removeEventListener('mouseleave', listeners.handleMouseLeave);
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
        </div>
    );
};

export default Calendar;
