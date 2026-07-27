
import { CustomerProfile } from '../components/CustomerProfile';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { ActivityForms } from '../components/ActivityForms';

export function Customers() {
    return (
        <div className="app-container">
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: 'var(--primary-color)' }}>Customer Details</h1>
            <CustomerProfile />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <ActivityTimeline />
                <ActivityForms />
            </div>
        </div>
    );
}
