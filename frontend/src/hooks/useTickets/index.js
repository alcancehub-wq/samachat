import { useState, useEffect, useContext } from "react";
import { getHoursCloseTicketsAuto } from "../../config";
import toastError from "../../errors/toastError";

import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { userHasPermission } from "../../utils/permissions";

const useTickets = ({
    searchParam,
    pageNumber,
    status,
    date,
    showAll,
    queueIds,
    withUnreadMessages,
    tagIds,
    followUp,
}) => {
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [count, setCount] = useState(0);
    const [refreshToken, setRefreshToken] = useState(0);
    const { isAuth, loading: authLoading, user } = useContext(AuthContext);
    const canViewTickets = userHasPermission(user, "tickets.view");

    useEffect(() => {
        const handleTaskUpdated = () => {
            setRefreshToken(current => current + 1);
        };

        window.addEventListener("samachat:task-updated", handleTaskUpdated);

        return () => {
            window.removeEventListener("samachat:task-updated", handleTaskUpdated);
        };
    }, []);

    useEffect(() => {
                if (authLoading || !isAuth || !canViewTickets) {
			setTickets([]);
			setHasMore(false);
			setCount(0);
			setLoading(false);
			return undefined;
		}

        setLoading(true);
        const delayDebounceFn = setTimeout(() => {
            const fetchTickets = async() => {
                try {
                    const { data } = await api.get("/tickets", {
                        params: {
                            searchParam,
                            pageNumber,
                            status,
                            date,
                            showAll,
                            queueIds,
                            withUnreadMessages,
                            tagIds,
                            followUp,
                        },
                    })
                    setTickets(data.tickets)

                    let horasFecharAutomaticamente = getHoursCloseTicketsAuto(); 

                    if (status === "open" && horasFecharAutomaticamente && horasFecharAutomaticamente !== "" &&
                        horasFecharAutomaticamente !== "0" && Number(horasFecharAutomaticamente) > 0) {

                        let dataLimite = new Date()
                        dataLimite.setHours(dataLimite.getHours() - Number(horasFecharAutomaticamente))

                        data.tickets.forEach(ticket => {
                            if (ticket.status !== "closed") {
                                let dataUltimaInteracaoChamado = new Date(ticket.updatedAt)
                                if (dataUltimaInteracaoChamado < dataLimite)
                                    closeTicket(ticket)
                            }
                        })
                    }

                    setHasMore(data.hasMore)
                    setCount(data.count)
                    setLoading(false)
                } catch (err) {
                    setLoading(false)
                    if (err?.response?.status !== 403) {
						toastError(err)
					}
                }
            }

            const closeTicket = async(ticket) => {
                await api.put(`/tickets/${ticket.id}`, {
                    status: "closed",
                    userId: ticket.userId || null,
                })
            }

            fetchTickets()
        }, 500)
        return () => clearTimeout(delayDebounceFn)
    }, [
        searchParam,
        authLoading,
        canViewTickets,
        pageNumber,
        status,
        date,
        isAuth,
        showAll,
        queueIds,
        withUnreadMessages,
        tagIds,
        followUp,
        refreshToken,
    ])

    return { tickets, loading, hasMore, count };
};

export default useTickets;