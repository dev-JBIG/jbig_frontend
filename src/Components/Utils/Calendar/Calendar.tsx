import React, { useEffect } from "react";
import $ from "jquery";
import Swal, { SweetAlertResult } from "sweetalert2";
import "fullcalendar/dist/fullcalendar.css";
import "fullcalendar";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { CalendarEvent}  from "../interfaces";
import moment from "moment";
import {deleteCalendarEvent, fetchCalendarEvents} from "../../../API/req";
import {useUser} from "../UserContext";
import {useNavigate} from "react-router-dom";

interface CalendarProps {
    staffAuth: boolean;
}

const Calendar: React.FC<CalendarProps> = ({ staffAuth }) => {
    const { signOutLocal, accessToken } = useUser();

    const navigate = useNavigate();

    useEffect(() => {
        $(document).on("show.bs.popover", "[data-toggle='popover']", function (this: HTMLElement) {
            // 현재 트리거(this)를 제외한 다른 popover는 모두 닫음
            ($("[data-toggle='popover']").not(this as any) as any).popover("hide");
        });

        // 바깥 클릭 시 닫음
        const handler = (e: any) => {
            if (
                !$(e.target).closest(".popover").length &&
                !$(e.target).closest("[data-toggle='popover']").length
            ) {
                ($("[data-toggle='popover']") as any).popover("hide");
            }
        };
        $(document).on("click", handler);

        return () => {
            $(document).off("show.bs.popover");
            $(document).off("click", handler);
        };
    }, []);

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const events: CalendarEvent[] = await fetchCalendarEvents();

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
                    events,
                    eventClick: function (calEvent: any, jsEvent: MouseEvent) {
                        jsEvent.preventDefault();

                        // 시간 포맷 (시작 ~ 종료)
                        const start = calEvent.start ? moment(calEvent.start).format("YYYY-MM-DD HH:mm") : "";
                        const end = calEvent.end ? moment(calEvent.end).format("YYYY-MM-DD HH:mm") : "";
                        const timeText = start && end ? `${start} ~ ${end}` : start || end;

                        if (!staffAuth) {
                            // 일반 사용자: 일정 내용만 보여줌
                            Swal.fire({
                                title: calEvent.title,
                                html: `
                                    <div style="text-align: left; margin-top: 10px;">
                                        <strong>시간:</strong> ${timeText}<br/>
                                        <strong>설명:</strong> ${calEvent.description || "없음"}
                                    </div>
                                `,
                                confirmButtonText: "확인",
                                customClass: {
                                    confirmButton: "btn btn-primary"
                                }
                            });
                        } else {
                            // 스태프: 수정/삭제 버튼 제공
                            Swal.fire({
                                title: calEvent.title,
                                html: `
                                    <div style="text-align: left; margin-top: 10px;">
                                        <strong>시간:</strong> ${timeText}<br/>
                                        <strong>설명:</strong> ${calEvent.description || "없음"}
                                    </div>
                                `,
                                showCancelButton: true,
                                showDenyButton: true,
                                confirmButtonText: "수정",
                                denyButtonText: "삭제",
                                cancelButtonText: "취소",
                                customClass: {
                                    confirmButton: "btn btn-primary",
                                    denyButton: "btn btn-danger",
                                    cancelButton: "btn btn-secondary"
                                },
                                buttonsStyling: true
                            }).then(async (result: SweetAlertResult) => {
                                if (result.isConfirmed) {
                                    const payload = {
                                        id: calEvent.id,
                                        title: calEvent.title,
                                        description: calEvent.description || '',
                                        color: calEvent.color || '#3788d8',
                                        allDay: !!calEvent.allDay,
                                        start: calEvent.start ? calEvent.start.toDate() : null,
                                        end: calEvent.end ? calEvent.end.toDate() : null,
                                    };

                                    window.dispatchEvent(new CustomEvent('OPEN_EVENT_MODAL', {
                                        detail: {mode: 'edit', event: payload}
                                    }));
                                    // 팝오버 닫음
                                    ($("[data-toggle='popover']") as any).popover("hide");
                                } else if (result.isDenied) {
                                    const removeKey = calEvent.id ?? calEvent._id;

                                    if (!accessToken) {
                                        alert("로그인이 필요합니다.");
                                        signOutLocal();
                                        navigate("/signin");
                                        return;
                                    }

                                    try {
                                        await deleteCalendarEvent(removeKey, accessToken);
                                        ($("#calendar") as any).fullCalendar("removeEvents", removeKey); // UI 반영함
                                        ($("[data-toggle='popover']") as any).popover("hide");
                                    } catch (err) {
                                        console.error("이벤트 삭제 실패:", err);
                                        alert("이벤트 삭제 중 오류가 발생했습니다.");
                                    }
                                }
                            });
                        }
                    },
                    eventRender: function (event: any, element: any) {
                        element.attr("data-toggle", "popover");

                        // 기본 시간/타이틀 제거함
                        element.find(".fc-time").remove();
                        element.find(".fc-title").html("");

                        // 시간 포맷 (시작 ~ 종료)
                        const start = event.start ? moment(event.start).format("MM/DD HH:mm") : "";
                        const end = event.end ? moment(event.end).format("MM/DD HH:mm") : "";
                        const timeText = start && end ? `${start} ~ ${end}` : start || end;

                        // Popover 내용 (시간 + description)
                        element.popover({
                            title: `${event.title}`,
                            content: `
                                <div><strong>시간: </strong> ${timeText}</div>
                                <div><strong>설명: </strong>${event.description || ""}</div>
                            `,
                            trigger: "manual",
                            placement: "top",
                            container: "body",
                            html: true
                        });

                        element.on("mouseenter", function (this: HTMLElement) {
                            ($(this) as any).popover("show");
                        });
                        element.on("mouseleave", function (this: HTMLElement) {
                            setTimeout(() => {
                                if (!$(".popover:hover").length) ($(this) as any).popover("hide");
                            }, 120);
                        });
                        element.on("click", function (this: HTMLElement) {
                            setTimeout(() => { ($(this) as any).popover("toggle"); }, 0);
                        });

                        // 캘린더 셀 내부에는 title만 표시함
                        element.find(".fc-title").append(`
                            <div class="fc-event-title">${event.title}</div>
                        `);
                    }
                });
            } catch (err) {
                console.error("캘린더 이벤트 불러오기 실패:", err);
            }
        };

        loadEvents();
    }, [staffAuth, accessToken, signOutLocal, navigate]);

    return (
        <div style={{ padding: "30px 0 0 0", width: "100%" }}>
            <div id="calendar" style={{ width: "100%", maxWidth: "900px", margin: "0 auto" }}></div>
        </div>
    );
};

export default Calendar;
