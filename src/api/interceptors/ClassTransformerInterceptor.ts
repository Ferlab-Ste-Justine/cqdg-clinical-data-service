import { Action, Interceptor, InterceptorInterface } from 'routing-controllers';
import { classToPlain } from 'class-transformer';

@Interceptor()
export class ClassTransformerInterceptor implements InterceptorInterface {
    public intercept(action: Action, content: any): any {
        // class-transformer will remove all content annotated with @Exclude() in the response
        if ('application/json' === (action.response.getHeader('Content-Type') || '').toLowerCase()) {
            return classToPlain(content);
        }
        return content;
    }
}
