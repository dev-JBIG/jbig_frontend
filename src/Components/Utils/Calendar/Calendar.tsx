import React, { useEffect, useState } from "react";
import $ from "jquery";
import "fullcalendar/dist/fullcalendar.css";
import "fullcalendar";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { CalendarEvent}  from "../interfaces";
import moment from "moment";

const Calendar: React.FC = () => {
    useEffect(() => {
        const handler = (e: any) => {
            console.log("????D");
            if (
                !$(e.target).closest(".popover").length &&
                !$(e.target).closest("[data-toggle='popover']").length
            ) {
                ($("[data-toggle='popover']") as any).popover("hide");
            }
        };

        $(document).on("click", handler);
        return () => {
            $(document).off("click", handler);
        };
    }, []);

    useEffect(() => {
        // 샘플 이벤트 (실제는 API 연동)
        const sampleEvents: CalendarEvent[] = [
            {
                id: "1",
                title: "팀 미팅",
                start: new Date("2025-08-21T10:00:00"),
                end: new Date("2025-08-21T11:00:00"),
                color: "#3788d8",
                description: "주간 업무 점검",
            },
            {
                id: "2",
                title: "점심 약속",
                start: new Date("2025-08-24T10:00:00"),
                end: new Date("2025-08-24T11:00:00"),
                color: "#e74c3c",
                description: "맛있는 식당 맛있는 음식 맛있는 것,"
            },
            {
                id: "3",
                title: "휴가",
                start: new Date("2025-08-15T10:00:00"),
                end: new Date("2025-08-18T11:00:00"),
                color: "#2ecc71",
                description: "여행",
            },
        ];

        ($("#calendar") as any).fullCalendar({
            locale: "ko",
            defaultView: "month",
            header: {
                left: "prev",
                center: "title",
                right: "next",
            },
            buttonIcons: {
                prev: "left-single-arrow",
                next: "right-single-arrow",
            },
            editable: false,
            eventLimit: true,
            events: sampleEvents,

            eventRender: function (event: any, element: any) {
                element.attr("data-toggle", "popover");

                // 기본 시간/타이틀 제거
                element.find(".fc-time").remove();
                element.find(".fc-title").html("");

                // 시간 포맷 (시작 ~ 종료)
                const start = event.start ? moment(event.start).format("MM/DD HH:mm") : "";
                const end = event.end ? moment(event.end).format("MM/DD HH:mm") : "";
                const timeText = start && end ? `${start} ~ ${end}` : start || end;

                // Popover 내용 (시간 + description)
                element.popover({
                    title: event.title, // 팝오버 제목은 title만
                    content: `
                    <div><strong>시간:</strong> ${timeText}</div>
                    <div><strong>내용:</strong> ${event.description}</div>
                    `,
                    trigger: "click",
                    placement: "top",
                    container: "body",
                    html: true
                });

                // 캘린더 셀 내부에는 title만 표시
                element.find(".fc-title").append(`
                <div class="fc-event-title">${event.title}</div>
            `);}
        });
    }, []);

    return (
        <div style={{ padding: "30px 0 0 0", width: "100%" }}>
            <div id="calendar" style={{ width: "100%", maxWidth: "900px", margin: "0 auto" }}></div>
        </div>
    );
};

export default Calendar;
