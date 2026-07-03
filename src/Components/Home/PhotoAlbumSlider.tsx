import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPhotoAlbumPosts, PhotoPostItem } from "../../API/req";
import { Section } from "../Utils/interfaces";
import useInViewOnce from "../Utils/useInViewOnce";

interface PhotoAlbumSliderProps {
    boards: Section[];
}

interface PhotoSlide {
    url: string;
    title: string;
    postId: number;
}

const PHOTO_BOARD_TYPE = 4;

const isImageName = (name: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);

const PhotoAlbumSlider: React.FC<PhotoAlbumSliderProps> = ({ boards }) => {
    const [slides, setSlides] = useState<PhotoSlide[]>([]);
    const [index, setIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const photoBoard = useMemo(() => {
        return boards.flatMap((sec) => sec.boards).find((b) =>
            b.board_type === PHOTO_BOARD_TYPE || b.name === "사진첩"
        );
    }, [boards]);

    const shouldLoad = useInViewOnce(sliderRef, {
        enabled: Boolean(photoBoard?.id),
        rootMargin: "200px 0px",
    });

    useEffect(() => {
        if (!photoBoard?.id || !shouldLoad) return;
        let mounted = true;
        (async () => {
            try {
                const posts: PhotoPostItem[] = await fetchPhotoAlbumPosts(photoBoard.id, 30);
                const images: PhotoSlide[] = [];

                posts.forEach((post) => {
                    const attachments = Array.isArray(post.attachment_paths) ? post.attachment_paths : [];
                    attachments.forEach((att) => {
                        if (att?.url && isImageName(att.name || att.url)) {
                            images.push({ url: att.url, title: post.title, postId: post.id });
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
        return () => {
            mounted = false;
        };
    }, [photoBoard?.id, shouldLoad]);

    useEffect(() => {
        if (slides.length <= 1 || isPaused) return;
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % slides.length);
        }, 4500);
        return () => clearInterval(timer);
    }, [slides.length, isPaused]);

    const current = slides[index];

    const handleOpenPost = () => {
        if (!current || !photoBoard?.id) return;
        navigate(`/board/${photoBoard.id}/${current.postId}`);
    };

    if (!photoBoard) return null;

    return (
        <div
            ref={sliderRef}
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
                    <div
                        className="photo-album-frame"
                        role="button"
                        tabIndex={0}
                        onClick={handleOpenPost}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") handleOpenPost();
                        }}
                    >
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
