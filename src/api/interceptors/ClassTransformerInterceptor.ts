import { Action, Interceptor, InterceptorInterface } from 'routing-controllers';
import { classToPlain } from 'class-transformer';
import { ServerResponse } from 'http';

@Interceptor()
export class ClassTransformerInterceptor implements InterceptorInterface {
    public intercept(action: Action, content: any): any {
        // class-transformer filter out all content annotated with @Exclude()
        // if content is a ServerResponse, it is not one of our classes - do not alter.
        if (!(content instanceof ServerResponse)) {
            return classToPlain(content);
        }
        return content;
    }
}
