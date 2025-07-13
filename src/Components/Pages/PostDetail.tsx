import React from "react";
import { useParams } from "react-router-dom";

function PostDetail() {
    const { category, id } = useParams();

    return (
        <div>
            <h2>[{category}] 게시글 상세</h2>
            <p>게시글 ID: {id}</p>
            <p>여기에 게시글 내용을 표시합니다.</p>
        </div>
    );
}

export default PostDetail;
