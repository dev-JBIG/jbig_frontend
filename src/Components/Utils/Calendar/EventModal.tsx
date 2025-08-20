import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './EventModal.css';
import {CalendarEventCreate} from "../interfaces";

interface EventModalProps {
    onClose: () => void;
    onSave: (event: CalendarEventCreate) => void;
}

const colorOptions = [
    '#3788d8', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#3df0fc', '#34495e',
];

const getInitialStartTime = () => {
    const now = new Date();
    now.setHours(9, 0, 0, 0); // 오전 9시 기본값
    return now;
};

const EventModal: React.FC<EventModalProps> = ({ onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [start, setStart] = useState<Date | null>(getInitialStartTime());
    const [endManuallySet, setEndManuallySet] = useState(false);
    const [end, setEnd] = useState<Date | null>(null);
    const [description, setDescription] = useState('');
    const [allDay, setAllDay] = useState(false);
    const [color, setColor] = useState(colorOptions[0]);

    useEffect(() => {
        if (start instanceof Date && !endManuallySet) {
            if (!end || (end instanceof Date && end <= start)) {
                setEnd(new Date(start.getTime() + 60 * 60 * 1000));
            }
        }
    }, [start]);

    const handleAllDayChange = (isChecked: boolean) => {
        setAllDay(isChecked);

        if (isChecked) {
            if (start instanceof Date) {
                setStart(new Date(start.getFullYear(), start.getMonth(), start.getDate()));
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!start) {
            alert("시작 날짜/시간은 필수입니다.");
            return;
        }
        if (!title) {
            alert("일정 제목은 필수입니다.");
            return;
        }
        if (!allDay && !end) {
            alert("종료 날짜/시간은 필수입니다.");
            return;
        }

        const newEvent: CalendarEventCreate = {
            title,
            start,
            end,
            allDay,
            color,
            description,
        };

        onSave(newEvent);
    };

    return ReactDOM.createPortal(
        <div className="modal-backdrop">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>새 일정 추가</h2>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="title">일정 제목</label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />

                    <div className="modal-label-row">
                        <label>시작</label>
                        <div className="all-day-check">
                            <input
                                id="all-day"
                                type="checkbox"
                                checked={allDay}
                                onChange={(e) => handleAllDayChange(e.target.checked)}
                            />
                            <label htmlFor="all-day">하루 종일</label>
                        </div>
                    </div>

                    {/* 시작 날짜 */}
                    <DatePicker
                        selected={start}
                        onChange={(date) => setStart(date)}
                        dateFormat={allDay ? "yyyy-MM-dd" : "yyyy-MM-dd HH:mm"}
                        showTimeSelect={!allDay}
                        timeFormat="HH:mm"
                        timeIntervals={30}
                        placeholderText="시작 날짜/시간 선택"
                    />

                    {/* 종료 날짜 (선택) */}
                    {!allDay && (
                        <>
                            <label>종료</label>
                            <DatePicker
                                selected={end}
                                onChange={(date) => { setEnd(date); setEndManuallySet(true); }}
                                dateFormat="yyyy-MM-dd HH:mm"
                                showTimeSelect
                                timeFormat="HH:mm"
                                timeIntervals={30}
                                placeholderText="종료 날짜/시간 선택"
                                minDate={start || undefined}/>
                        </>
                    )}

                    <label htmlFor="description">설명 (선택)</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={50}
                    />
                    <p style={{ textAlign: "right" }}>{description.length} / 50</p>

                    <label>색상</label>
                    <div className="color-picker">
                        {colorOptions.map((c) => (
                            <div
                                key={c}
                                className={`color-swatch ${color === c ? 'selected' : ''}`}
                                style={{backgroundColor: c}}
                                onClick={() => setColor(c)}
                            />
                        ))}
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-btn">취소</button>
                        <button type="submit" className="save-btn">저장</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default EventModal;
