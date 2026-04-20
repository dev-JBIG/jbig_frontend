import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

// PostDetail과 동일한 화이트리스트 기반 스키마. text-align / color / background-color 스타일만 허용.
export const safeSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...(defaultSchema.attributes?.div || []),
      ['style', /^text-align:\s*(left|center|right);?$/i],
    ],
    span: [
      ...(defaultSchema.attributes?.span || []),
      ['style', /^color:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|[a-zA-Z]+);?$/i],
    ],
  },
};

// @uiw/react-md-editor 내부 react-markdown-preview는 기본적으로 rehypeRaw를 사용한다.
// 저장형/자가 XSS 방어를 위해 previewOptions.rehypePlugins에 rehypeSanitize를 함께 넘겨
// PostDetail 렌더링과 동일한 정책을 유지한다.
export const safeSanitizePlugin: [typeof rehypeSanitize, typeof safeSanitizeSchema] = [
  rehypeSanitize,
  safeSanitizeSchema,
];
