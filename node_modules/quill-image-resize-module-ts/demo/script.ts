import * as Quill from 'quill';
import { ImageResize } from '../';

Quill.register('modules/imageResize', ImageResize);

let quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
        imageResize: {
            modules: ['Resize', 'DisplaySize', 'Toolbar']
        }
    }
});
