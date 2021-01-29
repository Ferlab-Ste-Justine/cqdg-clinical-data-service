import { Action, Interceptor, InterceptorInterface } from 'routing-controllers';
import { classToPlain } from 'class-transformer';

@Interceptor()
export class ClassTransformerInterceptor implements InterceptorInterface {
    public intercept(action: Action, content: any): any {
        // class-transformer will remove all content annotated with @Exclude() in the response
        return classToPlain(content);
    }
}
