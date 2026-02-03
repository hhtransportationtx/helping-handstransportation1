import { useEffect, useState } from 'react';
import { Cake } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BirthdayPerson {
  id: string;
  full_name: string;
  date_of_birth: string;
  role: string;
  photo_url?: string;
  daysUntil: number;
  isToday: boolean;
}

export function BirthdayReminders() {
  const [birthdays, setBirthdays] = useState<BirthdayPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingBirthdays();
  }, []);

  const loadUpcomingBirthdays = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, date_of_birth, role, photo_url')
        .not('date_of_birth', 'is', null)
        .eq('status', 'active');

      if (error) throw error;

      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const currentDay = today.getDate();

      const upcomingBirthdays = data
        .map((person: any) => {
          const birthDate = new Date(person.date_of_birth);
          const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

          let daysUntil = Math.floor((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntil < 0) {
            const nextYearBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
            daysUntil = Math.floor((nextYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }

          const isToday = birthDate.getMonth() === currentMonth && birthDate.getDate() === currentDay;

          return {
            ...person,
            daysUntil,
            isToday,
          };
        })
        .filter((person: BirthdayPerson) => person.daysUntil <= 30)
        .sort((a: BirthdayPerson, b: BirthdayPerson) => a.daysUntil - b.daysUntil);

      setBirthdays(upcomingBirthdays);
    } catch (error) {
      console.error('Error loading birthdays:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBirthdayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cake className="w-5 h-5 text-pink-500" />
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Birthdays</h3>
        </div>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (birthdays.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cake className="w-5 h-5 text-pink-500" />
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Birthdays</h3>
        </div>
        <p className="text-gray-500 text-sm">No upcoming birthdays in the next 30 days</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Cake className="w-5 h-5 text-pink-500" />
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Birthdays</h3>
      </div>

      <div className="space-y-3">
        {birthdays.map((person) => (
          <div
            key={person.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              person.isToday
                ? 'bg-pink-50 border-2 border-pink-300'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {person.photo_url ? (
              <img
                src={person.photo_url}
                alt={person.full_name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white"
              />
            ) : (
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(person.full_name)}&background=random&size=40`}
                alt={person.full_name}
                className="w-10 h-10 rounded-full"
              />
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{person.full_name}</p>
              <p className="text-sm text-gray-500 capitalize">{person.role}</p>
            </div>

            <div className="text-right">
              {person.isToday ? (
                <div className="flex items-center gap-1">
                  <Cake className="w-4 h-4 text-pink-500" />
                  <span className="text-sm font-semibold text-pink-600">Today!</span>
                </div>
              ) : person.daysUntil === 1 ? (
                <span className="text-sm font-medium text-orange-600">Tomorrow</span>
              ) : (
                <>
                  <p className="text-xs text-gray-500">{formatBirthdayDate(person.date_of_birth)}</p>
                  <p className="text-xs text-gray-400">in {person.daysUntil} days</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
