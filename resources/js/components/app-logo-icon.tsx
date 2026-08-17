import { HTMLAttributes } from 'react';

export default function AppLogoIcon(props: HTMLAttributes<HTMLImageElement>) {
    return (
        <img src="/launcher.png" alt="DiaChat" {...props} />
    );
}
