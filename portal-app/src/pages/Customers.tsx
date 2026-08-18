import { useParams } from 'react-router-dom';
import { CustomerProfile } from '../components/CustomerProfile';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { ActivityForms } from '../components/ActivityForms';
import { CustomerList } from '../components/CustomerList';
import { CustomerFollowUps } from '../components/CustomerFollowUps';
import { FollowUpForm } from '../components/FollowUpForm';

export function Customers() {
    const { id } = useParams();

    if (!id) {
        return (
            <div className="app-container">
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: 'var(--primary-color)' }}>Select a Customer</h1>
                <CustomerList />
            </div>
        );
    }

    return (
        <div className="app-container">
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: 'var(--primary-color)' }}>Customer Details</h1>
            <CustomerProfile customerId={id} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <CustomerFollowUps customerId={id} />
                    <ActivityTimeline customerId={id} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <FollowUpForm customerId={id} />
                    <ActivityForms customerId={id} />
                </div>
            </div>
        </div>
    );
}
