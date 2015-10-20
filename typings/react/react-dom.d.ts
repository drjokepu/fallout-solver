/// <reference path="./react.d.ts" />

declare module "react-dom" {
    export function render<P, S>(
        element: __React.ReactElement< P >,
        container: Element,
        callback?: () => any): __React.Component<P, S>;
}