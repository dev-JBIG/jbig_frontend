import React, { useEffect, useMemo, useState } from "react";
import { fetchPhotoAlbumPosts, PhotoPostItem } from "../../API/req";
import { Section } from "../Utils/interfaces";

interface PhotoAlbumSliderProps {
    boards: Section[];
}

interface PhotoSlide {
    url: string;
    title: string;
}

const PHOTO_BOARD_TYPE = 4;

const isImageName = (name: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);

const PhotoAlbumSlider: React.FC<PhotoAlbumSliderProps> = ({ boards }) => {
    const [slides, setSlides] = useState<PhotoSlide[]>([]);
    const [index, setIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const photoBoard = useMemo(() => {
        return boards.flatMap((sec) => sec.boards).find((b) =>
            b.board_type === PHOTO_BOARD_TYPE || b.name === "사진첩"
        );
    }, [boards]);

    useEffect(() => {
        if (!photoBoard?.id) return;
        let mounted = true;
        (async () => {
            try {
                const posts: PhotoPostItem[] = await fetchPhotoAlbumPosts(photoBoard.id, 30);
                const images: PhotoSlide[] = [];

                posts.forEach((post) => {
                    const attachments = Array.isArray(post.attachment_paths) ? post.attachment_paths : [];
                    attachments.forEach((att) => {
                        if (att?.url && isImageName(att.name || att.url)) {
                            images.push({ url: att.url, title: post.title });
                        }
                    });
                });

                if (mounted) {
                    setSlides(images.slice(0, 18));
                    setIndex(0);
                }
            } catch {
                if (mounted) setSlides([]);
            }
        })();
        return () => { mounted = false; };
    }, [photoBoard?.id]);

    useEffect(() => {
        if (slides.length <= 1 || isPaused) return;
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % slides.length);
        }, 4500);
        return () => clearInterval(timer);
    }, [slides.length, isPaused]);

    const current = slides[index];

    if (!photoBoard) return null;

    return (
        <div
            className="photo-album-slider"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {current ? (
                <>
                    <button
                        type="button"
                        className="photo-album-nav prev"
                        onClick={() => setIndex((index - 1 + slides.length) % slides.length)}
                        aria-label="이전 사진"
                    >
                        ‹
                    </button>
                    <div className="photo-album-frame">
                        <img
                            key={current.url}
                            src={current.url}
                            alt={current.title}
                            className="photo-album-image"
                            loading="lazy"
                        />
                        <div className="photo-album-caption">{current.title}</div>
                    </div>
                    <button
                        type="button"
                        className="photo-album-nav next"
                        onClick={() => setIndex((index + 1) % slides.length)}
                        aria-label="다음 사진"
                    >
                        ›
                    </button>
                </>
            ) : (
                <div className="photo-album-empty">
                    아직 사진이 없습니다.
                </div>
            )}
        </div>
    );
};

export default PhotoAlbumSlider;
