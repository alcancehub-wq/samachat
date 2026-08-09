import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { makeStyles } from '@material-ui/core/styles';
import { Badge, Divider, IconButton, Popover, Tooltip, Typography } from '@material-ui/core';
import { MoreVert, NotificationsNone } from '@material-ui/icons';

import { i18n } from '../../translate/i18n';
import api from '../../services/api';
import TicketOptionsMenu from '../TicketOptionsMenu';
import ButtonWithSpinner from '../ButtonWithSpinner';
import toastError from '../../errors/toastError';
import { AuthContext } from '../../context/Auth/AuthContext';

const useStyles = makeStyles((theme) => ({
  actionButtons: {
    marginRight: 6,
    flex: 'none',
    alignSelf: 'center',
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    '& > *': {
      margin: theme.spacing(1),
    },
    [theme.breakpoints.down('sm')]: {
      marginRight: 0,
      '& > *': {
        margin: 0,
      },
    },
  },
  primaryActionButton: {
    borderRadius: 4,
    textTransform: 'none',
    fontWeight: 700,
    boxShadow: 'none !important',
    backgroundColor: '#FF1919 !important',
    color: '#FFFFFF !important',
    '&:hover': {
      backgroundColor: '#E11414 !important',
      boxShadow: 'none !important',
    },
  },
  secondaryActionButton: {
    borderRadius: 4,
    textTransform: 'none',
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
  menuButton: {
    color: theme.palette.text.secondary,
    [theme.breakpoints.down('sm')]: {
      padding: 8,
    },
  },
  scheduleButton: {
    color: theme.palette.text.secondary,
    [theme.breakpoints.down('sm')]: {
      padding: 8,
    },
  },
  activeScheduleButton: {
    color: '#FF1919',
  },
  schedulePopover: {
    width: 340,
    maxWidth: 'calc(100vw - 32px)',
    borderRadius: 14,
    padding: theme.spacing(1.5),
  },
  schedulePopoverTitle: {
    fontWeight: 700,
    fontSize: '0.95rem',
    marginBottom: theme.spacing(1),
  },
  scheduleItem: {
    padding: theme.spacing(1, 0),
  },
  scheduleDate: {
    fontWeight: 700,
    fontSize: '0.85rem',
    color: theme.palette.text.primary,
  },
  scheduleBody: {
    marginTop: 3,
    fontSize: '0.85rem',
    color: theme.palette.text.secondary,
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  },
  scheduleMeta: {
    marginTop: 4,
    fontSize: '0.78rem',
    color: theme.palette.text.secondary,
  },
  emptyScheduleText: {
    fontSize: '0.85rem',
    color: theme.palette.text.secondary,
  },
}));

const formatScheduleDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getSchedulePreview = (schedule) => {
  const body = schedule?.body?.trim();

  if (body) {
    return body;
  }

  if (schedule?.mediaOriginalName) {
    return `Mídia agendada: ${schedule.mediaOriginalName}`;
  }

  return 'Agendamento sem texto';
};

const TicketActionButtons = ({ ticket, contactId, contactName }) => {
  const classes = useStyles();
  const history = useHistory();
  const [anchorEl, setAnchorEl] = useState(null);
  const [scheduleAnchorEl, setScheduleAnchorEl] = useState(null);
  const [pendingSchedules, setPendingSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const ticketOptionsMenuOpen = Boolean(anchorEl);
  const schedulePopoverOpen = Boolean(scheduleAnchorEl);
  const { user } = useContext(AuthContext);
  const ticketId = ticket?.id;

  const loadPendingSchedules = async () => {
    if (!ticketId) {
      setPendingSchedules([]);
      return;
    }

    setSchedulesLoading(true);

    try {
      const { data } = await api.get('/schedules', {
        params: {
          ticketId,
          status: 'pending',
        },
      });

      setPendingSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err);
      setPendingSchedules([]);
    } finally {
      setSchedulesLoading(false);
    }
  };

  useEffect(() => {
    loadPendingSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const handleOpenTicketOptionsMenu = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleCloseTicketOptionsMenu = (e) => {
    setAnchorEl(null);
  };

  const handleOpenSchedulePopover = async (e) => {
    setScheduleAnchorEl(e.currentTarget);
    await loadPendingSchedules();
  };

  const handleCloseSchedulePopover = () => {
    setScheduleAnchorEl(null);
  };

  const handleUpdateTicketStatus = async (e, status, userId) => {
    setLoading(true);
    try {
      const { data: updatedTicket } = await api.put(`/tickets/${ticket.id}`, {
        status: status,
        userId: userId || null,
      });

      setLoading(false);
      if (status === 'open') {
        window.dispatchEvent(
          new CustomEvent("samachat:ticket-updated", {
            detail: { ticket: updatedTicket }
          })
        );

        history.push(`/tickets/${ticket.id}`);
      } else {
        history.push('/tickets');
      }
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
  };

  return (
    <div className={classes.actionButtons}>
      {ticket.status === 'pending' && (
        <ButtonWithSpinner
          loading={loading}
          size="small"
          variant="contained"
          className={classes.primaryActionButton}
          onClick={(e) => handleUpdateTicketStatus(e, 'open', user?.id)}
        >
          {i18n.t('messagesList.header.buttons.accept')}
        </ButtonWithSpinner>
      )}

      <Tooltip title="Agendamentos do cliente">
        <IconButton
          className={`${classes.scheduleButton} ${
            pendingSchedules.length ? classes.activeScheduleButton : ''
          }`}
          onClick={handleOpenSchedulePopover}
          aria-label="Agendamentos do cliente"
        >
          <Badge
            color="secondary"
            badgeContent={pendingSchedules.length}
            invisible={!pendingSchedules.length}
          >
            <NotificationsNone />
          </Badge>
        </IconButton>
      </Tooltip>

      <IconButton className={classes.menuButton} onClick={handleOpenTicketOptionsMenu}>
        <MoreVert />
      </IconButton>

      <Popover
        open={schedulePopoverOpen}
        anchorEl={scheduleAnchorEl}
        onClose={handleCloseSchedulePopover}
        getContentAnchorEl={null}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        classes={{ paper: classes.schedulePopover }}
      >
        <Typography className={classes.schedulePopoverTitle}>Agendamentos pendentes</Typography>

        {schedulesLoading && (
          <Typography className={classes.emptyScheduleText}>Carregando agendamentos...</Typography>
        )}

        {!schedulesLoading && pendingSchedules.length === 0 && (
          <Typography className={classes.emptyScheduleText}>
            Nenhum agendamento pendente para este cliente.
          </Typography>
        )}

        {!schedulesLoading &&
          pendingSchedules.map((schedule, index) => (
            <div key={schedule.id} className={classes.scheduleItem}>
              {index > 0 && <Divider />}
              <Typography className={classes.scheduleDate}>
                {formatScheduleDate(schedule.scheduledAt)}
              </Typography>
              <Typography className={classes.scheduleBody}>
                {getSchedulePreview(schedule)}
              </Typography>
              <Typography className={classes.scheduleMeta}>
                {schedule.createdBy?.name
                  ? `Criado por: ${schedule.createdBy.name}`
                  : 'Criador não informado'}
                {schedule.assignee?.name ? ` • Responsável: ${schedule.assignee.name}` : ''}
              </Typography>
            </div>
          ))}
      </Popover>

      <TicketOptionsMenu
        ticket={ticket}
        contactId={contactId}
        contactName={contactName}
        anchorEl={anchorEl}
        menuOpen={ticketOptionsMenuOpen}
        handleClose={handleCloseTicketOptionsMenu}
      />
    </div>
  );
};

export default TicketActionButtons;
