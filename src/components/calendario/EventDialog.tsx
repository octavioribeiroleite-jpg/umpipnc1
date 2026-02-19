import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CalendarEvent, EventStatus, CreateEventInput, UpdateEventInput } from '@/hooks/useEvents';
import { Calendar, Link, Trash2, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  start_date: z.string().min(1, 'Data é obrigatória'),
  start_time: z.string().optional(),
  end_date: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['confirmado', 'pendente', 'cancelado']),
  all_day: z.boolean(),
  color: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  onSave: (data: CreateEventInput | UpdateEventInput) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  lockColor?: string;
}

const colorOptions = [
  { value: '#10b981', label: 'Verde' },
  { value: '#0d9488', label: 'Teal' },
  { value: '#6366f1', label: 'Índigo' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#f97316', label: 'Laranja' },
  { value: '#6b7280', label: 'Cinza' },
];

const colorToSocietyName: Record<string, string> = {
  '#3b82f6': 'UMP',
  '#ec4899': 'SAF',
  '#10b981': 'UPH',
  '#f97316': 'UPA',
  '#8b5cf6': 'UCP',
  '#6b7280': 'IPNC',
};

const statusLabels: Record<string, string> = {
  confirmado: '✓ Confirmado',
  pendente: '⏳ Pendente',
  cancelado: '✗ Cancelado',
};

export function EventDialog({
  open,
  onOpenChange,
  event,
  onSave,
  onDelete,
  isLoading,
  readOnly = false,
  lockColor,
}: EventDialogProps) {
  const navigate = useNavigate();
  const isEditing = !!event;

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      start_date: '',
      start_time: '09:00',
      end_date: '',
      end_time: '',
      location: '',
      status: 'confirmado',
      all_day: false,
      color: lockColor || '#10b981',
    },
  });

  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start_date);
      const endDate = event.end_date ? new Date(event.end_date) : null;

      form.reset({
        title: event.title,
        description: event.description || '',
        start_date: startDate.toISOString().split('T')[0],
        start_time: event.all_day ? '' : startDate.toTimeString().slice(0, 5),
        end_date: endDate ? endDate.toISOString().split('T')[0] : '',
        end_time: endDate && !event.all_day ? endDate.toTimeString().slice(0, 5) : '',
        location: event.location || '',
        status: event.status,
        all_day: event.all_day || false,
        color: event.color || '#10b981',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_date: '',
        end_time: '',
        location: '',
        status: 'confirmado',
        all_day: false,
        color: lockColor || '#10b981',
      });
    }
  }, [event, form, lockColor]);

  const onSubmit = (values: EventFormValues) => {
    const startDateTime = values.all_day
      ? `${values.start_date}T00:00:00`
      : `${values.start_date}T${values.start_time || '09:00'}:00`;

    let endDateTime: string | undefined;
    if (values.end_date) {
      endDateTime = values.all_day
        ? `${values.end_date}T23:59:59`
        : `${values.end_date}T${values.end_time || '18:00'}:00`;
    }

    const data: CreateEventInput | UpdateEventInput = {
      ...(event && { id: event.id }),
      title: values.title,
      description: values.description,
      start_date: startDateTime,
      end_date: endDateTime,
      location: values.location,
      status: values.status as EventStatus,
      all_day: values.all_day,
      color: lockColor || values.color,
    };

    onSave(data);
  };

  const handleDelete = () => {
    if (event && onDelete) {
      onDelete(event.id);
    }
  };

  const goToMeeting = () => {
    if (event?.reuniao_id) {
      navigate(`/reunioes/${event.reuniao_id}`);
      onOpenChange(false);
    }
  };

  // Read-only view
  if (readOnly && event) {
    const startDate = new Date(event.start_date);
    const societyName = colorToSocietyName[event.color || ''] || 'IPNC';

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {event.title}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={event.origem === 'reuniao' ? 'secondary' : 'outline'}>
                {event.origem === 'reuniao' ? 'Via Reunião' : 'Manual'}
              </Badge>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${event.color || '#6b7280'}15`, color: event.color || '#6b7280' }}>
                {societyName}
              </span>
              {event.reuniao_id && (
                <Button variant="ghost" size="sm" onClick={goToMeeting} className="h-6 px-2">
                  <Link className="h-3 w-3 mr-1" />
                  Ver reunião
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {event.all_day ? (
                <span>Dia inteiro — {format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              ) : (
                <span>{format(startDate, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</span>
              )}
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{event.location}</span>
              </div>
            )}
            {event.description && (
              <div className="text-sm text-muted-foreground pt-1 border-t border-border/50">
                {event.description}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span>{statusLabels[event.status] || event.status}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isEditing ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
          {event && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={event.origem === 'reuniao' ? 'secondary' : 'outline'}>
                {event.origem === 'reuniao' ? 'Via Reunião' : 'Manual'}
              </Badge>
              {event.reuniao_id && (
                <Button variant="ghost" size="sm" onClick={goToMeeting} className="h-6 px-2">
                  <Link className="h-3 w-3 mr-1" />
                  Ver reunião
                </Button>
              )}
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do evento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!form.watch('all_day') && (
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de término (opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!form.watch('all_day') && form.watch('end_date') && (
                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="all_day"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Dia inteiro</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Local do evento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalhes do evento" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="confirmado">✓ Confirmado</SelectItem>
                        <SelectItem value="pendente">⏳ Pendente</SelectItem>
                        <SelectItem value="cancelado">✗ Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!lockColor ? (
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a cor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: option.value }}
                                />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  <FormLabel>Cor</FormLabel>
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lockColor }} />
                    <span className="text-sm text-muted-foreground">
                      {colorToSocietyName[lockColor] || 'Sociedade'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              {isEditing && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
